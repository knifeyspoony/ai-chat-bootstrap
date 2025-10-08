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

const MAX_RECENT_SURVIVORS_DEFAULT = 4;
const MAX_ARTIFACTS_DEFAULT = 3;
const MESSAGE_SNIPPET_LENGTH = 640;
let snapshotSequence = 0;

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
  /**
   * @deprecated Use maxRecentMessages instead.
   */
  minRecentMessages?: number;
  maxRecentMessages?: number;
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

function generateSnapshotId(now: number): string {
  snapshotSequence = (snapshotSequence + 1) % Number.MAX_SAFE_INTEGER;
  const sequencePart = snapshotSequence.toString(36);
  return `snapshot-${now}-${sequencePart}`;
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
  maxRecentMessages: number;
  pinnedEntries: ConversationEntry[];
  conversationEntries: ConversationEntry[];
  artifacts: ArtifactContextEntry[];
}): string {
  const {
    reason,
    budget,
    usageTotalTokens,
    maxRecentMessages,
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
    `Pinned messages must remain verbatim. We will preserve up to the most recent ${maxRecentMessages} turns automatically—note in the summary if anything critical should stay verbatim.`
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
    "Respond with JSON that matches the provided schema. Focus on emitting concise artifacts that replace older context."
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
    minRecentMessages,
    maxRecentMessages: maxRecentMessagesOption,
    maxArtifacts = MAX_ARTIFACTS_DEFAULT,
    generateOptions,
    buildGenerateOptions,
    onError,
  } = options;

  const maxRecentMessages = Math.max(
    0,
    typeof maxRecentMessagesOption === "number"
      ? maxRecentMessagesOption
      : typeof minRecentMessages === "number"
      ? minRecentMessages
      : MAX_RECENT_SURVIVORS_DEFAULT
  );

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
        maxRecentMessages,
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

      const knownMessageIds = new Set(
        body.messages
          .map((message) => message.id)
          .filter((id): id is string => Boolean(id))
      );

      const messageMap = new Map<string, UIMessage>();
      body.messages.forEach((message) => {
        if (message?.id) {
          messageMap.set(message.id, message);
        }
      });

      const now = Date.now();
      const snapshotId = generateSnapshotId(now);
      const existingArtifacts = Array.isArray(body.artifacts)
        ? body.artifacts
            .filter((artifact): artifact is CompressionArtifact => Boolean(artifact?.id))
            .map((artifact) => ({ ...artifact }))
        : [];

      const artifactBlueprints = Array.isArray(llmPayload.artifacts)
        ? llmPayload.artifacts.slice(0, Math.max(maxArtifacts, 0))
        : [];

      const newArtifacts: CompressionArtifact[] = [];
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

        newArtifacts.push({
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

      const artifactMap = new Map<string, CompressionArtifact>();
      existingArtifacts.forEach((artifact) => {
        if (!artifact?.id) return;
        artifactMap.set(artifact.id, artifact);
      });
      newArtifacts.forEach((artifact) => {
        artifactMap.set(artifact.id, artifact);
      });
      const combinedArtifacts = Array.from(artifactMap.values());

      const pinnedMessagesForTokens = pinnedMessages.map((pin) => {
        const candidateId = pin.message?.id ?? pin.id;
        if (!candidateId) return pin.message;
        return messageMap.get(candidateId) ?? pin.message;
      });
      const pinnedTokenCount = calculateTokensForMessages(
        pinnedMessagesForTokens.filter(
          (message): message is UIMessage => Boolean(message)
        )
      );

      const budgetForRecent =
        normalizedConfig.maxTokenBudget !== null &&
        normalizedConfig.maxTokenBudget > 0
          ? normalizedConfig.maxTokenBudget
          : null;

      const recentSurvivorIds: string[] = [];
      if (maxRecentMessages > 0) {
        const seenRecent = new Set<string>();
        let recentTokenAccumulator = 0;

        for (let index = body.messages.length - 1; index >= 0; index -= 1) {
          const message = body.messages[index];
          const id = message?.id;
          if (!id) continue;
          if (pinnedIds.has(id)) continue;
          if (seenRecent.has(id)) continue;

          const messageTokens = calculateTokensForMessages([message]);

          if (
            budgetForRecent !== null &&
            pinnedTokenCount + recentTokenAccumulator + messageTokens >
              budgetForRecent
          ) {
            continue;
          }

          recentSurvivorIds.unshift(id);
          seenRecent.add(id);
          recentTokenAccumulator += messageTokens;

          if (recentSurvivorIds.length >= maxRecentMessages) {
            break;
          }
        }
      }

      let survivorSet = new Set<string>([...pinnedIds, ...recentSurvivorIds]);

      if (combinedArtifacts.length > 0) {
        const artifactSourceIds = new Set<string>();
        combinedArtifacts.forEach((artifact) => {
          artifact.sourceMessageIds?.forEach((id) => {
            if (id) {
              artifactSourceIds.add(id);
            }
          });
        });

        if (artifactSourceIds.size > 0) {
          artifactSourceIds.forEach((id) => {
            if (!pinnedIds.has(id)) {
              survivorSet.delete(id);
            }
          });
        }
      }

      const orderedSurvivorIds: string[] = [];
      body.messages.forEach((message) => {
        const id = message?.id;
        if (id && survivorSet.has(id)) {
          orderedSurvivorIds.push(id);
        }
      });

      pinnedMessages.forEach((pin) => {
        const id = pin.message?.id ?? pin.id;
        if (id && survivorSet.has(id) && !orderedSurvivorIds.includes(id)) {
          orderedSurvivorIds.unshift(id);
        }
      });

      const snapshot: CompressionSnapshot = {
        id: snapshotId,
        createdAt: now,
        survivingMessageIds: orderedSurvivorIds,
        artifactIds: combinedArtifacts.map((artifact) => artifact.id),
        tokensBefore:
          body.usage?.totalTokens ?? baselineResult.usage.totalTokens,
        reason: body.reason,
      };

      const finalResult = buildCompressionPayload({
        baseMessages: body.messages,
        pinnedMessages,
        artifacts: combinedArtifacts,
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
        artifacts: combinedArtifacts,
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
