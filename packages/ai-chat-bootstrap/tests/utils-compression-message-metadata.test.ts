import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';

import {
  COMPRESSION_MESSAGE_METADATA_KEY,
  extractPinnedMessagesFromMetadata,
  withCompressionPinnedState,
} from '../lib/utils/compression/message-metadata';

describe('compression message metadata helpers', () => {
  it('embeds pinned metadata on messages and extracts stored pins', () => {
    const baseMessage: UIMessage = {
      id: 'm1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Summaries are available' }],
    } as UIMessage;

    const pinnedMessage = withCompressionPinnedState(baseMessage, {
      pinnedAt: 1_705_000_000_000,
      pinnedBy: 'user',
      reason: 'keep this introduction',
    });

    expect(pinnedMessage).not.toBe(baseMessage);
    expect(baseMessage.metadata).toBeUndefined();
    expect(pinnedMessage.metadata).toBeDefined();
    expect(
      (pinnedMessage.metadata ?? {})[COMPRESSION_MESSAGE_METADATA_KEY]
    ).toBeDefined();

    const pins = extractPinnedMessagesFromMetadata([pinnedMessage]);
    expect(pins).toHaveLength(1);
    expect(pins[0]?.id).toBe('m1');
    expect(pins[0]?.pinnedAt).toBe(1_705_000_000_000);
    expect(pins[0]?.pinnedBy).toBe('user');
    expect(pins[0]?.reason).toBe('keep this introduction');
  });

  it('removes pinned metadata when clearing a message', () => {
    const baseMessage: UIMessage = {
      id: 'm2',
      role: 'user',
      parts: [{ type: 'text', text: 'Follow-up question' }],
    } as UIMessage;

    const pinned = withCompressionPinnedState(baseMessage, {
      pinnedAt: 1_705_000_123_456,
    });

    const cleared = withCompressionPinnedState(pinned, null);

    expect(
      (cleared.metadata ?? {})[COMPRESSION_MESSAGE_METADATA_KEY]
    ).toBeUndefined();

    const pins = extractPinnedMessagesFromMetadata([cleared]);
    expect(pins).toHaveLength(0);
  });

  it('returns the original message reference when the pinned state is unchanged', () => {
    const baseMessage: UIMessage = {
      id: 'm3',
      role: 'assistant',
      parts: [{ type: 'text', text: 'System note' }],
    } as UIMessage;

    const pinned = withCompressionPinnedState(baseMessage, {
      pinnedAt: 1_705_000_222_000,
      pinnedBy: 'system',
    });

    const samePinned = withCompressionPinnedState(pinned, {
      pinnedAt: 1_705_000_222_000,
      pinnedBy: 'system',
    });

    expect(samePinned).toBe(pinned);
  });
});
