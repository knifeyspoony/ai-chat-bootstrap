import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import type { NormalizedCompressionConfig } from '../lib/types/compression';
import type { CompressionArtifact, CompressionPinnedMessage } from '../lib/types/compression';
import { buildCompressionPayload } from '../lib/utils/compression/build-payload';

const BASE_CONFIG: NormalizedCompressionConfig = {
  enabled: true,
  maxTokenBudget: null,
  compressionThreshold: 0.85,
  pinnedMessageLimit: null,
};

describe('buildCompressionPayload', () => {
  it('orders pinned messages ahead of surviving ones and appends artifacts', () => {
    const baseMessages: UIMessage[] = [
      {
        id: 'm1',
        role: 'system',
        parts: [{ type: 'text', text: 'rules' } as any],
      },
      {
        id: 'm2',
        role: 'user',
        parts: [{ type: 'text', text: 'hello' } as any],
      },
      {
        id: 'm3',
        role: 'assistant',
        parts: [{ type: 'text', text: 'hi!' } as any],
      },
    ];

    const pinnedMessages: CompressionPinnedMessage[] = [
      {
        id: 'm2',
        message: baseMessages[1],
        pinnedAt: 10,
      },
    ];

    const artifacts: CompressionArtifact[] = [
      {
        id: 'a1',
        summary: 'Latest summary',
        category: 'summary',
        createdAt: 20,
      },
    ];

    const payload = buildCompressionPayload({
      baseMessages,
      pinnedMessages,
      artifacts,
      snapshot: null,
      config: BASE_CONFIG,
    });

    expect(payload.messages.map((m) => m.id)).toEqual([
      'm2',
      'm1',
      'm3',
      'artifact-a1',
    ]);
    expect(payload.pinnedMessageIds).toEqual(['m2']);
    expect(payload.artifactIds).toEqual(['a1']);
    expect(payload.survivingMessageIds).toEqual(['m2', 'm1', 'm3']);
    expect(payload.shouldCompress).toBe(false);
    expect(payload.overBudget).toBe(false);
    expect(payload.usage).toMatchObject({
      pinnedTokens: 2,
      survivingTokens: 3,
      artifactTokens: 4,
      totalTokens: 9,
    });
    expect(payload.usage.budget).toBeUndefined();
  });

  it('falls back to pinned message payload when base message is missing', () => {
    const baseMessages: UIMessage[] = [
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'start' } as any],
      },
    ];

    const orphanPinned: CompressionPinnedMessage = {
      id: 'm2',
      message: {
        id: 'm2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'lost' } as any],
      } as UIMessage,
      pinnedAt: 1,
    };

    const payload = buildCompressionPayload({
      baseMessages,
      pinnedMessages: [orphanPinned],
      artifacts: [],
      snapshot: null,
      config: BASE_CONFIG,
    });

    expect(payload.messages.map((m) => m.id)).toEqual(['m2', 'm1']);
    expect(payload.pinnedMessageIds).toEqual(['m2']);
    expect(payload.survivingMessageIds).toEqual(['m2', 'm1']);
    expect(payload.shouldCompress).toBe(false);
    expect(payload.overBudget).toBe(false);
    expect(payload.usage).toMatchObject({
      pinnedTokens: 1,
      survivingTokens: 2,
      artifactTokens: 0,
      totalTokens: 3,
    });
  });

  it('computes threshold flags and budget metadata when enabled', () => {
    const baseMessages: UIMessage[] = [
      {
        id: 'm1',
        role: 'system',
        parts: [{ type: 'text', text: 'rules' } as any],
      },
      {
        id: 'm2',
        role: 'user',
        parts: [{ type: 'text', text: 'hello there' } as any],
      },
    ];

    const pinnedMessages: CompressionPinnedMessage[] = [
      {
        id: 'm2',
        message: baseMessages[1],
        pinnedAt: 5,
      },
    ];

    const config: NormalizedCompressionConfig = {
      enabled: true,
      maxTokenBudget: 10,
      compressionThreshold: 0.5,
      pinnedMessageLimit: null,
    };

    const payload = buildCompressionPayload({
      baseMessages,
      pinnedMessages,
      artifacts: [],
      snapshot: null,
      config,
    });

    expect(payload.shouldCompress).toBe(true);
    expect(payload.overBudget).toBe(false);
    expect(payload.usage.budget).toBe(10);
    expect(payload.usage.remainingTokens).toBe(5);
  });
});
