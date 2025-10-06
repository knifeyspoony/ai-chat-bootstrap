import { generateObject } from "ai";
import type { LanguageModel, ModelMessage, UIMessage } from "ai";
import { z } from "zod";
import { buildCompressionPayload } from "../utils/compression/build-payload";
import {
  calculateTokensForMessages,
  estimateTokenLength,
  extractMessageText,
} from "../utils/compression/token-helpers";
import {
  normalizeCompressionConfig,
  type BuildCompressionPayloadResult,
  type CompressionArtifact,
  type CompressionServiceRequest,
  type CompressionServiceResponse,
  type CompressionSnapshot,
} from "../types/compression";
import { JSON_HEADERS, type GenerateObjectOptions } from "./shared";

const DEFAULT_SYSTEM_PROMPT = `You compress chat transcripts so future LLM calls stay within token limits. Summaries must be precise, retain action items, decisions, and user preferences, and never omit pinned messages. Always preserve the latest important turns so the assistant keeps context.`;

const MIN_RECENT_SURVIVORS_DEFAULT = 6;
const MAX_ARTIFACTS_DEFAULT = 3;
const MESSAGE_SNIPPET_LENGTH = 640;

const SummarizationSchema = z.object({
  surviving_message_ids: z.array(z.string().min(1)).optional(),
  artifacts: z
    .array(
      z.object({
        title: z.string().min(1).max(160).optional(),
        summary: z.string().min(1),
        category: z.string().min(1).max(64).optional(),
        source_message_ids: z.array(z.string().min(1)).optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

type SummarizationPayload = z.infer<typeof SummarizationSchema>;

interface ConversationEntry {
  index: number;
  id?: string;
  role?: UIMessage["role"];
  pinned: boolean;
  text: string;
}

interface ArtifactContextEntry {
  id: string;
  title?: string;
  category?: string;
  summary?: string;
}

interface ModelResolverContext {
  req: Request;
  body: CompressionServiceRequest;
  requestedModel: string | null;
}

type ModelResolver =
  | LanguageModel
  | ((ctx: ModelResolverContext) => Promise<LanguageModel | null | undefined> | LanguageModel | null | undefined);

export interface CreateCompressionHandlerOptions {
  model?: ModelResolver;
  systemPrompt?: string;
  minRecentMessages?: number;
  maxArtifacts?: number;
  generateOptions?: GenerateObjectOptions;
  buildGenerateOptions?: (
    ctx: { req: Request; body: CompressionServiceRequest }
  ) => Promise<GenerateObjectOptions> | GenerateObjectOptions;
  onError?: (
    error: unknown,
    ctx: { req: Request; body?: CompressionServiceRequest }
  ) => void;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function ensureUniqueIds(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  ids.forEach((id) => {
    if (!id) return;
    if (seen.has(id)) return;
    seen.add(id);
    result.push(id);
  });
  return result;
}

function buildConversationEntries(
  messages: UIMessage[],
  pinnedIds: Set<string>
): ConversationEntry[] {
  return messages.map((message, index) => {
    const rawText = extractMessageText(message);
    return {
      index: index + 1,
      id: message.id,
      role: message.role,
      pinned: Boolean(message.id && pinnedIds.has(message.id)),
      text: truncateText(normalizeWhitespace(rawText), MESSAGE_SNIPPET_LENGTH),
    } satisfies ConversationEntry;
  });
}

function buildArtifactsContext(artifacts: CompressionArtifact[]): ArtifactContextEntry[] {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return [];
  }
  return artifacts.map((artifact) => ({
    id: artifact.id,
    title: artifact.title,
    category: artifact.category,
    summary: artifact.summary ? truncateText(normalizeWhitespace(artifact.summary), MESSAGE_SNIPPET_LENGTH) : undefined,
  }));
}

function composePrompt(params: {
  reason: string | undefined;
  budget: number | null;
  usageTotalTokens: number;
  minRecentMessages: number;
  pinnedEntries: ConversationEntry[];
  conversationEntries: ConversationEntry[];
  artifacts: ArtifactContextEntry[];
}): string {
  const {
    reason,
    budget,
    usageTotalTokens,
    minRecentMessages,
    pinnedEntries,
    conversationEntries,
    artifacts,
  } = params;

  const lines: string[] = [];

  lines.push(
    `Compression trigger: ${reason ?? "unknown"}. Current transcript tokens (approx): ${usageTotalTokens}.`
  );
  if (budget !== null) {
    lines.push(`Token budget: ${budget}. Maintain safe headroom for upcoming replies.`);
  } else {
    lines.push("Token budget: unknown. Focus on keeping the transcript concise without losing critical context.");
  }

  lines.push(
    `Always retain pinned messages and ensure the most recent ${minRecentMessages} turns remain unless they are duplicates.`
  );

  if (pinnedEntries.length) {
    lines.push("Pinned message details:");
    pinnedEntries.forEach((entry) => {
      lines.push(
        `  • id=${entry.id} role=${entry.role ?? "unknown"} text="${entry.text}"`
      );
    });
  } else {
    lines.push("Pinned message details: none");
  }

  if (artifacts.length) {
    lines.push("Existing artifacts:");
    artifacts.forEach((artifact) => {
      const bits = [
        `id=${artifact.id}`,
        artifact.title ? `title="${artifact.title}"` : undefined,
        artifact.category ? `category=${artifact.category}` : undefined,
        artifact.summary ? `summary="${artifact.summary}"` : undefined,
      ].filter(Boolean);
      lines.push(`  • ${bits.join(" ")}`);
    });
  } else {
    lines.push("Existing artifacts: none");
  }

  lines.push("Conversation transcript (oldest → newest):");
  conversationEntries.forEach((entry) => {
    const meta = [
      `#${entry.index}`,
      entry.id ? `id=${entry.id}` : undefined,
      entry.role ? `role=${entry.role}` : undefined,
      entry.pinned ? "pinned=yes" : undefined,
    ]
      .filter(Boolean)
      .join(" ");

    lines.push(`  • ${meta || `#${entry.index}`}: ${entry.text || "(no text)"}`);
  });

  lines.push(
    "Respond with JSON that matches the provided schema. Include surviving_message_ids (string array) and artifacts (array of concise summaries)."
  );
  lines.push("Artifacts should cite source_message_ids for the turns they replace.");
  lines.push("Summaries must remain factual and omit speculation.");

  return lines.join("\n");
}

function finalizeSnapshot(
  initialResult: BuildCompressionPayloadResult,
  snapshot: CompressionSnapshot,
  finalResult: BuildCompressionPayloadResult
): CompressionSnapshot {
  const enhanced: CompressionSnapshot = {
    ...snapshot,
    tokensBefore:
      typeof snapshot.tokensBefore === "number"
        ? snapshot.tokensBefore
        : initialResult.usage.totalTokens,
    artifactIds:
      snapshot.artifactIds && snapshot.artifactIds.length
        ? snapshot.artifactIds
        : finalResult.artifactIds,
    survivingMessageIds:
      snapshot.survivingMessageIds && snapshot.survivingMessageIds.length
        ? snapshot.survivingMessageIds
        : finalResult.survivingMessageIds,
  };

  enhanced.tokensAfter = finalResult.usage.totalTokens;
  if (typeof enhanced.tokensBefore === "number") {
    enhanced.tokensSaved = Math.max(
      enhanced.tokensBefore - finalResult.usage.totalTokens,
      0
    );
  }

  return enhanced;
}

async function resolveModel(
  resolver: ModelResolver | undefined,
  ctx: ModelResolverContext
): Promise<LanguageModel | null> {
  if (!resolver) return null;
  if (typeof resolver === "function") {
    const result = await resolver(ctx);
    return result ?? null;
  }
  return resolver;
}

export function createCompressionHandler(
  options: CreateCompressionHandlerOptions = {}
): (req: Request) => Promise<Response> {
  const {
    model,
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    minRecentMessages = MIN_RECENT_SURVIVORS_DEFAULT,
    maxArtifacts = MAX_ARTIFACTS_DEFAULT,
    generateOptions,
    buildGenerateOptions,
    onError,
  } = options;

  return async function compressionHandler(req: Request): Promise<Response> {
    let body: CompressionServiceRequest | undefined;

    try {
      body = (await req.json()) as CompressionServiceRequest;
    } catch (error) {
      onError?.(error, { req });
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    try {
      if (!body?.messages || !Array.isArray(body.messages)) {
        return new Response(
          JSON.stringify({ error: "Missing messages for compression" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const pinnedMessages = Array.isArray(body.pinnedMessages)
        ? body.pinnedMessages
        : [];
      const pinnedIds = new Set(
        pinnedMessages
          .map((pin) => pin.message?.id ?? pin.id)
          .filter((id): id is string => Boolean(id))
      );

      const normalizedConfig = normalizeCompressionConfig({
        enabled: true,
        maxTokenBudget: body.config?.maxTokenBudget ?? null,
        compressionThreshold: body.config?.compressionThreshold,
        pinnedMessageLimit: body.config?.pinnedMessageLimit ?? null,
        model: body.config?.model ?? null,
      });

      const baselineResult = buildCompressionPayload({
        baseMessages: body.messages,
        pinnedMessages,
        artifacts: Array.isArray(body.artifacts) ? body.artifacts : [],
        snapshot: body.snapshot ?? null,
        config: normalizedConfig,
      });

      const requestedModelId = normalizedConfig.model;
      const resolvedModel = await resolveModel(model, {
        req,
        body,
        requestedModel: requestedModelId,
      });

      if (!resolvedModel) {
        return new Response(
          JSON.stringify({ error: "Compression model not configured" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const conversationEntries = buildConversationEntries(
        body.messages,
        pinnedIds
      );
      const pinnedEntries = conversationEntries.filter((entry) => entry.pinned);
      const artifactContext = buildArtifactsContext(
        Array.isArray(body.artifacts) ? body.artifacts : []
      );

      const prompt = composePrompt({
        reason: body.reason,
        budget: normalizedConfig.maxTokenBudget ?? null,
        usageTotalTokens: baselineResult.usage.totalTokens,
        minRecentMessages,
        pinnedEntries,
        conversationEntries,
        artifacts: artifactContext,
      });

      const messagesForModel: ModelMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ];

      const dynamicGenerateOptions = buildGenerateOptions
        ? await buildGenerateOptions({ req, body })
        : undefined;

      const generationResult = await generateObject({
        model: resolvedModel,
        schema: SummarizationSchema,
        messages: messagesForModel,
        ...(generateOptions ?? {}),
        ...(dynamicGenerateOptions ?? {}),
      });

      const llmPayload = (generationResult.object ?? {}) as SummarizationPayload;
      const survivingFromModel = ensureUniqueIds(
        Array.isArray(llmPayload.surviving_message_ids)
          ? llmPayload.surviving_message_ids
          : []
      );

      const recentIds = ensureUniqueIds(
        body.messages
          .slice(-Math.max(minRecentMessages, 0))
          .map((message) => message.id)
      );

      const knownMessageIds = new Set(
        body.messages
          .map((message) => message.id)
          .filter((id): id is string => Boolean(id))
      );

      const survivorIds = ensureUniqueIds([
        ...survivingFromModel.filter((id) => knownMessageIds.has(id)),
        ...pinnedIds,
        ...recentIds,
      ]);

      const effectiveSurvivorIds = survivorIds.length
        ? survivorIds
        : baselineResult.survivingMessageIds;

      const messageMap = new Map<string, UIMessage>();
      body.messages.forEach((message) => {
        if (message?.id) {
          messageMap.set(message.id, message);
        }
      });

      const now = Date.now();
      const artifactBlueprints = Array.isArray(llmPayload.artifacts)
        ? llmPayload.artifacts.slice(0, Math.max(maxArtifacts, 0))
        : [];

      const artifacts: CompressionArtifact[] = [];
      artifactBlueprints.forEach((artifact, index) => {
        const summary = normalizeWhitespace(artifact.summary ?? "");
        if (!summary) {
          return;
        }

        const title = artifact.title
          ? normalizeWhitespace(artifact.title)
          : undefined;
        const category = artifact.category
          ? normalizeWhitespace(artifact.category)
          : undefined;

        const sourceIds = ensureUniqueIds(
          Array.isArray(artifact.source_message_ids)
            ? artifact.source_message_ids.filter((id) =>
                id ? knownMessageIds.has(id) : false
              )
            : []
        );

        const sourceMessages = sourceIds
          .map((id) => messageMap.get(id))
          .filter((value): value is UIMessage => Boolean(value));

        const trimmedTokens = calculateTokensForMessages(sourceMessages);
        const summaryTokens = estimateTokenLength({
          title,
          summary,
        });

        const tokensSaved = Math.max(trimmedTokens - summaryTokens, 0);

        artifacts.push({
          id: `artifact-${now}-${index}`,
          title,
          summary,
          category,
          createdAt: now,
          updatedAt: now,
          tokensSaved: tokensSaved > 0 ? tokensSaved : undefined,
          sourceMessageIds: sourceIds.length ? sourceIds : undefined,
          editable: true,
        });
      });

      const snapshot: CompressionSnapshot = {
        id: body.snapshot?.id ?? `snapshot-${now}`,
        createdAt: body.snapshot?.createdAt ?? now,
        survivingMessageIds: effectiveSurvivorIds,
        artifactIds: artifacts.map((artifact) => artifact.id),
        tokensBefore:
          body.usage?.totalTokens ?? baselineResult.usage.totalTokens,
        reason: body.reason,
      };

      const finalResult = buildCompressionPayload({
        baseMessages: body.messages,
        pinnedMessages,
        artifacts,
        snapshot,
        config: normalizedConfig,
      });

      const enrichedSnapshot = finalizeSnapshot(
        baselineResult,
        snapshot,
        finalResult
      );

      const responsePayload: CompressionServiceResponse = {
        snapshot: enrichedSnapshot,
        artifacts,
        usage: finalResult.usage,
        pinnedMessages,
      };

      return new Response(JSON.stringify(responsePayload), {
        headers: JSON_HEADERS,
      });
    } catch (error) {
      onError?.(error, { req, body });
      const message =
        error instanceof Error
          ? error.message
          : "Failed to run compression";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}
