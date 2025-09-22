// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';

import type { UIMessage } from 'ai';
import { useAIChatCompression } from '../lib/hooks/use-ai-chat-compression';
import { useAICompressionStore, useAIContextStore } from '../lib/stores';

function CompressionHarness() {
  useAIChatCompression();
  return null;
}

describe('useAIChatCompression context exposure', () => {
  beforeEach(() => {
    useAIContextStore.getState().clearContext();
    useAICompressionStore.getState().reset();
  });

  afterEach(async () => {
    await act(async () => {
      useAICompressionStore.getState().reset();
      await Promise.resolve();
    });
    useAIContextStore.getState().clearContext();
    cleanup();
  });

  it('registers compression pins, artifacts, events, and metadata in useAIContext', async () => {
    await act(async () => {
      render(<CompressionHarness />);
      await Promise.resolve();
    });

    const message: UIMessage = {
      id: 'm1',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'First assistant reply with detailed content',
        } as UIMessage['parts'][number],
      ],
    } as UIMessage;

    await act(async () => {
      const store = useAICompressionStore.getState();
      store.pinMessage(message, {
        pinnedAt: 1_705_000_000_000,
        pinnedBy: 'user',
      });
      store.setArtifacts([
        {
          id: 'a1',
          title: 'Conversation Summary',
          summary: 'Earlier turns condensed for the active payload.',
          category: 'summary',
          createdAt: 1_705_000_100_000,
          updatedAt: 1_705_000_200_000,
          tokensSaved: 120,
          editable: true,
          sourceMessageIds: ['m1'],
        },
      ]);
      store.recordEvent({
        id: 'e1',
        type: 'run',
        timestamp: 1_705_000_300_000,
        level: 'info',
        message: 'Compression triggered (test)',
        payload: { totalTokens: 450 },
      });
      store.setModelMetadata({
        modelId: 'test-model',
        modelLabel: 'Test Model',
        contextWindowTokens: 8192,
        maxOutputTokens: 1024,
        lastUpdatedAt: 1_705_000_400_000,
      });
      store.setUsage(
        {
          totalTokens: 450,
          pinnedTokens: 100,
          artifactTokens: 80,
          survivingTokens: 270,
          budget: 600,
          remainingTokens: 150,
          estimatedResponseTokens: 200,
          updatedAt: 1_705_000_500_000,
        },
        { shouldCompress: true, overBudget: false }
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      const items = useAIContextStore.getState().listContext();
      expect(items.length).toBeGreaterThanOrEqual(4);

      const pins = items.find((item) => item.description === 'Compression Pinned Messages');
      const artifacts = items.find((item) => item.description === 'Compression Artifacts');
      const events = items.find((item) => item.description === 'Compression Events');
      const metadata = items.find((item) => item.description === 'Compression Model Metadata');

      expect(pins?.text).toContain('role=assistant');
      expect(artifacts?.text).toContain('Conversation Summary');
      expect(events?.text).toContain('Compression triggered (test)');
      expect(metadata?.text).toContain('shouldCompress');
    });

    await act(async () => {
      useAICompressionStore.getState().reset();
      await Promise.resolve();
    });

    await waitFor(() => {
      const items = useAIContextStore.getState().listContext();
      const pins = items.find((item) => item.description === 'Compression Pinned Messages');
      const artifacts = items.find((item) => item.description === 'Compression Artifacts');
      const events = items.find((item) => item.description === 'Compression Events');
      const metadata = items.find((item) => item.description === 'Compression Model Metadata');

      expect(pins).toBeUndefined();
      expect(artifacts).toBeUndefined();
      expect(events).toBeUndefined();
      expect(metadata).toBeUndefined();
    });
  });
});
