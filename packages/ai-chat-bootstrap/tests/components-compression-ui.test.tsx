// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within, waitFor } from '@testing-library/react';

import { CompressionBanner } from '../lib/components/chat/compression-banner';
import { CompressionUsageIndicator } from '../lib/components/chat/compression-usage-indicator';
import { CompressionArtifactsSheet } from '../lib/components/chat/compression-artifacts-sheet';
import { ChatInput } from '../lib/components/chat/chat-input';
import type {
  CompressionArtifact,
  CompressionController,
  CompressionSnapshot,
  CompressionUsage,
} from '../lib/types/compression';

function makeCompressionController(overrides: Partial<CompressionController> = {}): CompressionController {
  const noop = () => {};
  return {
    config: { enabled: true, maxTokenBudget: 1000, compressionThreshold: 0.8, pinnedMessageLimit: null },
    pinnedMessages: [],
    artifacts: [],
    events: [],
    usage: null,
    metadata: null,
    snapshot: null,
    shouldCompress: false,
    overBudget: false,
    actions: {
      pinMessage: noop,
      setPinnedMessages: noop,
      unpinMessage: noop,
      clearPinnedMessages: noop,
      addArtifact: noop,
      updateArtifact: noop,
      removeArtifact: noop,
      setArtifacts: noop,
      clearArtifacts: noop,
      recordEvent: noop,
      setModelMetadata: noop,
      setUsage: noop,
      setSnapshot: noop,
    },
    runCompression: undefined,
    ...overrides,
  };
}

describe('Compression UI components', () => {
  it('renders compression banner with snapshot details', () => {
    const snapshot: CompressionSnapshot = {
      id: 'snap-1',
      createdAt: Date.UTC(2025, 1, 16, 12, 30),
      survivingMessageIds: [],
      artifactIds: ['a1', 'a2'],
      tokensBefore: 1200,
      tokensAfter: 800,
      tokensSaved: 400,
      reason: 'over-budget',
    };
    const usage: CompressionUsage = {
      totalTokens: 800,
      pinnedTokens: 100,
      artifactTokens: 120,
      survivingTokens: 580,
      updatedAt: Date.now(),
    };

    const { getByText } = render(
      <CompressionBanner snapshot={snapshot} usage={usage} />
    );

    expect(getByText(/Context Compressed/i)).toBeTruthy();
    expect(getByText(/400 tokens/i)).toBeTruthy();
    expect(getByText(/Artifacts/)).toBeTruthy();
  });

  it('shows over budget state in usage indicator', () => {
    const compression = makeCompressionController({
      overBudget: true,
      usage: {
        totalTokens: 1200,
        pinnedTokens: 200,
        artifactTokens: 100,
        survivingTokens: 900,
        remainingTokens: -200,
        budget: 1000,
        updatedAt: Date.now(),
      },
    });

    const { getByRole } = render(
      <CompressionUsageIndicator compression={compression} />
    );

    const trigger = getByRole('button', { name: /over budget/i });
    expect(trigger.textContent).toContain('120%');
  });

  it('surfaces compression errors in the usage indicator', () => {
    const compression = makeCompressionController({
      events: [
        {
          id: 'error-1',
          type: 'error',
          timestamp: Date.now(),
          level: 'error',
          message: 'Summarizer failed',
          payload: { phase: 'summarizer' },
        },
      ],
    });

    const { getByRole } = render(
      <CompressionUsageIndicator compression={compression} />
    );

    const trigger = getByRole('button', { name: /compression error/i });
    expect(trigger.textContent).toMatch(/--%|\d+%/);

    fireEvent.click(trigger);

    const dialog = getByRole('dialog');
    const dialogUtils = within(dialog);
    expect(dialogUtils.getByText(/Compression error/i)).toBeTruthy();
    expect(dialogUtils.getByText(/Summarizer failed/)).toBeTruthy();
    expect(dialogUtils.getAllByText(/summarizer/i).length).toBeGreaterThan(0);
  });

  it('allows manually triggering compression from the usage popover', async () => {
    const runCompression = vi.fn().mockResolvedValue({
      messages: [],
      pinnedMessageIds: [],
      artifactIds: [],
      survivingMessageIds: [],
      usage: {
        totalTokens: 0,
        pinnedTokens: 0,
        artifactTokens: 0,
        survivingTokens: 0,
        updatedAt: Date.now(),
      },
      shouldCompress: false,
      overBudget: false,
    });

    const compression = makeCompressionController({
      runCompression,
      usage: {
        totalTokens: 200,
        pinnedTokens: 20,
        artifactTokens: 15,
        survivingTokens: 165,
        remainingTokens: 800,
        budget: 1000,
        updatedAt: Date.now(),
      },
    });

    const { getByRole } = render(
      <CompressionUsageIndicator compression={compression} />
    );

    const trigger = getByRole('button', { name: /compression usage/i });
    fireEvent.click(trigger);

    const dialog = getByRole('dialog');
    const popoverUtils = within(dialog);
    const manualButton = popoverUtils.getByRole('button', {
      name: /compress conversation/i,
    });

    expect(manualButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(manualButton);

    await waitFor(() => {
      expect(runCompression).toHaveBeenCalledWith({
        force: true,
        reason: 'manual',
      });
    });
  });

  it('renders artifact sheet button with badge and triggers updates', () => {
    const updateArtifact = vi.fn();
    const removeArtifact = vi.fn();
    const artifacts: CompressionArtifact[] = [
      {
        id: 'artifact-1',
        title: 'Summary',
        summary: 'Original summary',
        category: 'summary',
        createdAt: Date.now(),
        editable: true,
      },
    ];

    const compression = makeCompressionController({
      artifacts,
      actions: {
        ...makeCompressionController().actions,
        updateArtifact,
        removeArtifact,
      },
    });

    const { getByTitle, getByPlaceholderText, getByText } = render(
      <CompressionArtifactsSheet compression={compression} />
    );

    const trigger = getByTitle(/open compression artifacts/i);
    expect(trigger.textContent).toContain('1');

    fireEvent.click(trigger);

    const summaryField = getByPlaceholderText(/Describe the condensed/i) as HTMLTextAreaElement;
    fireEvent.change(summaryField, { target: { value: 'Edited summary' } });

    const saveButton = getByTitle(/save changes/i);
    fireEvent.click(saveButton);

    expect(updateArtifact).toHaveBeenCalledWith('artifact-1', expect.objectContaining({ summary: 'Edited summary' }));

    const deleteButton = getByTitle(/delete artifact/i);
    fireEvent.click(deleteButton);
    expect(removeArtifact).toHaveBeenCalledWith('artifact-1');
  });

  it('renders compression usage indicator without artifacts button before compression', () => {
    const compression = makeCompressionController({
      usage: {
        totalTokens: 300,
        pinnedTokens: 50,
        artifactTokens: 40,
        survivingTokens: 210,
        budget: 1000,
        remainingTokens: 700,
        updatedAt: Date.now(),
      },
    });

    const { getByRole, queryByTitle } = render(
      <ChatInput
        value="hello"
        onChange={() => {}}
        onSubmit={() => {}}
        compression={compression}
        enableSuggestions={false}
        suggestions={[]}
        suggestionsCount={3}
        allFocusItems={[]}
      />
    );

    expect(getByRole('button', { name: /compression usage/i })).toBeTruthy();
    expect(queryByTitle(/open compression artifacts/i)).toBeNull();
  });

  it('does not render compression usage indicator when compression is disabled', () => {
    const defaultConfig = makeCompressionController().config!;
    const compression = makeCompressionController({
      config: { ...defaultConfig, enabled: false },
      usage: {
        totalTokens: 300,
        pinnedTokens: 50,
        artifactTokens: 40,
        survivingTokens: 210,
        budget: 1000,
        remainingTokens: 700,
        updatedAt: Date.now(),
      },
    });

    const { queryByRole } = render(
      <ChatInput
        value="hello"
        onChange={() => {}}
        onSubmit={() => {}}
        compression={compression}
        enableSuggestions={false}
        suggestions={[]}
        suggestionsCount={3}
        allFocusItems={[]}
      />
    );

    expect(queryByRole('button', { name: /compression usage/i })).toBeNull();
  });

  it('shows compression artifacts button once the chat has been compressed', () => {
    const compression = makeCompressionController({
      artifacts: [
        {
          id: 'artifact-1',
          summary: 'conversation summary',
          createdAt: Date.now(),
        },
      ],
    });

    const { getByTitle } = render(
      <ChatInput
        value="hello"
        onChange={() => {}}
        onSubmit={() => {}}
        compression={compression}
        enableSuggestions={false}
        suggestions={[]}
        suggestionsCount={3}
        allFocusItems={[]}
      />
    );

    expect(getByTitle(/open compression artifacts/i)).toBeTruthy();
  });
});
