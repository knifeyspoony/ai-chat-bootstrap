import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import {
  CompressionServiceError,
  fetchCompressionService,
} from '../lib/services/compression-service';
import type { CompressionServiceRequest } from '../lib/types/compression';

describe('fetchCompressionService', () => {
  const sampleMessage: UIMessage = {
    id: 'm1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hello there' } as UIMessage['parts'][number]],
  } as UIMessage;

  const sampleRequest: CompressionServiceRequest = {
    messages: [sampleMessage],
    pinnedMessages: [],
    artifacts: [],
    snapshot: null,
    usage: {
      totalTokens: 25,
      pinnedTokens: 5,
      artifactTokens: 0,
      survivingTokens: 20,
      updatedAt: Date.now(),
    },
    config: {
      maxTokenBudget: 100,
      compressionThreshold: 0.8,
      pinnedMessageLimit: null,
    },
    metadata: null,
    reason: 'threshold',
  };

  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      // @ts-expect-error allow cleanup when fetch undefined
      delete globalThis.fetch;
    }
    vi.restoreAllMocks();
  });

  it('POSTs to the compression endpoint and returns parsed data', async () => {
    const responseData = {
      snapshot: {
        id: 'snap-1',
        createdAt: Date.now(),
        survivingMessageIds: ['m1'],
        artifactIds: [],
      },
      artifacts: [],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue(responseData),
    });

    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await fetchCompressionService(sampleRequest);

    expect(mockFetch).toHaveBeenCalledWith('/api/compression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleRequest),
      signal: undefined,
    });
    expect(result).toEqual(responseData);
  });

  it('throws CompressionServiceError when response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn(),
    });

    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await expect(fetchCompressionService(sampleRequest)).rejects.toBeInstanceOf(
      CompressionServiceError,
    );
  });

  it('throws CompressionServiceError when response JSON cannot be parsed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    });

    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await expect(fetchCompressionService(sampleRequest)).rejects.toBeInstanceOf(
      CompressionServiceError,
    );
  });
});
