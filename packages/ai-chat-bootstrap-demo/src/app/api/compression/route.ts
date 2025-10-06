import { createAzure } from "@ai-sdk/azure";
import {
  createCompressionHandler,
  type CompressionServiceRequest,
} from "ai-chat-bootstrap/server";

// Configure Azure OpenAI similarly to other demo routes
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME ?? "your-resource",
  apiKey: process.env.AZURE_API_KEY ?? "your-api-key",
  apiVersion: process.env.AZURE_API_VERSION ?? "preview",
});

const FALLBACK_DEPLOYMENT = "gpt-4.1";
const DEFAULT_COMPRESSION_DEPLOYMENT =
  process.env.AZURE_COMPRESSION_DEPLOYMENT_ID ??
  process.env.AZURE_DEPLOYMENT_ID ??
  FALLBACK_DEPLOYMENT;

const hasAzureCreds =
  Boolean(process.env.AZURE_RESOURCE_NAME) && Boolean(process.env.AZURE_API_KEY);

const handler = createCompressionHandler({
  model: ({ body }) => {
    if (!hasAzureCreds) {
      return null;
    }

    const requestedDeployment = body.config?.model ?? DEFAULT_COMPRESSION_DEPLOYMENT;
    if (!requestedDeployment) {
      return null;
    }

    return azure(requestedDeployment);
  },
  generateOptions: { temperature: 0 },
  buildGenerateOptions: ({ body }: { body: CompressionServiceRequest }) => {
    if (process.env.NODE_ENV !== "production") {
      const budget = body.config.maxTokenBudget ?? "unknown";
      const totalTokens = body.usage.totalTokens;
      console.log(
        `[compression-api] reason=${body.reason} tokens=${totalTokens} budget=${budget}`
      );
    }
    return {};
  },
  onError: (error: unknown, { body }) => {
    console.error("Compression API error:", error, {
      reason: body?.reason,
      budget: body?.config?.maxTokenBudget,
    });
  },
});

export { handler as POST };
