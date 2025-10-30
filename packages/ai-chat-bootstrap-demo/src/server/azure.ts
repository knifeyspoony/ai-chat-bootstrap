import { createAzure } from "@ai-sdk/azure";

type AzureAuthType = "api-key" | "aad";

const DEFAULT_AUTH_TYPE: AzureAuthType = "api-key";

function resolveAzureAuthType(): AzureAuthType {
  const authType = process.env.AZURE_AUTH_TYPE?.toLowerCase();
  return authType === "aad" ? "aad" : DEFAULT_AUTH_TYPE;
}

function resolveAzureSecret(authType: AzureAuthType): string {
  const fallback = authType === "aad" ? "your-aad-token" : "your-api-key";
  return process.env.AZURE_API_KEY ?? fallback;
}

export function createAzureClient() {
  const authType = resolveAzureAuthType();
  const secret = resolveAzureSecret(authType);

  const baseConfig = {
    resourceName: process.env.AZURE_RESOURCE_NAME ?? "your-resource",
    apiVersion: process.env.AZURE_API_VERSION ?? "preview",
  };

  if (authType === "aad") {
    return createAzure({
      ...baseConfig,
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });
  }

  return createAzure({
    ...baseConfig,
    apiKey: secret,
    headers: {
      "api-key": secret,
    },
  });
}

export function hasAzureCredentials(): boolean {
  return Boolean(process.env.AZURE_RESOURCE_NAME) && Boolean(process.env.AZURE_API_KEY);
}

export function getAzureAuthType(): AzureAuthType {
  return resolveAzureAuthType();
}
