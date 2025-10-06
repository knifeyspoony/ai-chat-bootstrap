import type {
  CompressionServiceOptions,
  CompressionServiceRequest,
  CompressionServiceResponse,
} from "../types/compression";

export class CompressionServiceError extends Error {
  status?: number;
  statusText?: string;

  constructor(message: string, options: { status?: number; statusText?: string } = {}) {
    super(message);
    this.name = "CompressionServiceError";
    if (options.status !== undefined) {
      this.status = options.status;
    }
    if (options.statusText !== undefined) {
      this.statusText = options.statusText;
    }
  }
}

export async function fetchCompressionService(
  request: CompressionServiceRequest,
  options: CompressionServiceOptions = {}
): Promise<CompressionServiceResponse> {
  const { signal, api = "/api/compression" } = options;

  const response = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new CompressionServiceError(
      `Compression request failed: ${response.status} ${response.statusText}`,
      { status: response.status, statusText: response.statusText }
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new CompressionServiceError("Failed to parse compression response JSON", {
      status: response.status,
      statusText: response.statusText,
    });
  }

  if (!data || typeof data !== "object") {
    throw new CompressionServiceError("Invalid compression response shape", {
      status: response.status,
      statusText: response.statusText,
    });
  }

  return data as CompressionServiceResponse;
}
