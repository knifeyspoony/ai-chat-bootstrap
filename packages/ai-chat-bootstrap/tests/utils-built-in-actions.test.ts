// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UIMessage } from 'ai';

import {
  buildBuiltInActions,
  createCopyAction,
  createDebugAction,
  createFeedbackActions,
  createRegenerateAction,
} from '../lib/utils/built-in-actions';

const baseMessage: UIMessage = {
  id: 'msg-1',
  role: 'assistant',
  parts: [
    { type: 'text', text: 'Hello world' },
  ],
};

const messageWithMultipleParts: UIMessage = {
  id: 'msg-2',
  role: 'assistant',
  parts: [
    { type: 'text', text: 'First line' },
    { type: 'reasoning', text: 'internal thought' },
    { type: 'text', text: 'Second line' },
  ],
};

const emptyMessage: UIMessage = {
  id: 'msg-empty',
  role: 'assistant',
  parts: [
    { type: 'text', text: '   ' },
  ],
};

const originalNavigator = globalThis.navigator;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  if (originalNavigator) {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as any).navigator;
  }
});

describe('createCopyAction', () => {
  it('disables copy when message has no text content', () => {
    const action = createCopyAction();
    expect(action.disabled?.(emptyMessage)).toBe(true);
  });

  it('enables copy and writes concatenated text to clipboard', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    });

    const action = createCopyAction();

    expect(action.disabled?.(messageWithMultipleParts)).toBe(false);
    action.onClick(messageWithMultipleParts);

    expect(writeText).toHaveBeenCalledWith('First line\n\nSecond line');
  });

  it('warns when clipboard API unavailable', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const action = createCopyAction();
    action.onClick(baseMessage);

    expect(warnSpy).toHaveBeenCalledWith('Clipboard API not available in this environment');
  });
});

describe('createRegenerateAction', () => {
  it('hides regenerate action when regenerate handler absent', () => {
    const action = createRegenerateAction({});

    expect(action.visible?.(baseMessage)).toBe(false);
    expect(action.disabled?.(baseMessage)).toBe(true);
  });

  it('invokes regenerate handler with message id and respects loading state', () => {
    const regenerate = vi.fn().mockResolvedValue(undefined);
    const action = createRegenerateAction({ regenerate, isLoading: false });

    expect(action.onlyOnMostRecent).toBe(true);
    expect(action.visible?.(baseMessage)).toBe(true);
    expect(action.disabled?.(baseMessage)).toBe(false);

    action.onClick(baseMessage);
    expect(regenerate).toHaveBeenCalledWith({ messageId: baseMessage.id });

    const loadingAction = createRegenerateAction({ regenerate, isLoading: true });
    expect(loadingAction.disabled?.(baseMessage)).toBe(true);
  });
});

describe('createFeedbackActions', () => {
  it('creates thumbs up and thumbs down actions that proxy to callbacks', () => {
    const onThumbsUp = vi.fn();
    const onThumbsDown = vi.fn();

    const [thumbsUp, thumbsDown] = createFeedbackActions({ onThumbsUp, onThumbsDown });

    expect(thumbsUp.id).toBe('built-in-thumbs-up');
    expect(thumbsDown.id).toBe('built-in-thumbs-down');

    thumbsUp.onClick(baseMessage);
    thumbsDown.onClick(baseMessage);

    expect(onThumbsUp).toHaveBeenCalledWith(baseMessage);
    expect(onThumbsDown).toHaveBeenCalledWith(baseMessage);
  });
});

describe('createDebugAction', () => {
  it('logs message details and shows alert when available', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const originalAlert = window.alert;
    const alertSpy = vi.fn();
    window.alert = alertSpy as unknown as typeof window.alert;

    const action = createDebugAction();
    action.onClick(baseMessage);

    expect(logSpy).toHaveBeenCalledWith('Message debug info:', {
      id: baseMessage.id,
      role: baseMessage.role,
      parts: baseMessage.parts,
      metadata: baseMessage.metadata,
    });
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Message ID: ${baseMessage.id}`)
    );

    window.alert = originalAlert;
  });
});

describe('buildBuiltInActions', () => {
  it('combines requested built-in actions in consistent order', () => {
    const regenerate = vi.fn();
    const actions = buildBuiltInActions(
      {
        copy: true,
        regenerate: true,
        feedback: {
          onThumbsUp: vi.fn(),
          onThumbsDown: vi.fn(),
        },
        debug: true,
      },
      {
        regenerate,
        isLoading: false,
      }
    );

    expect(actions.map((a) => a.id)).toEqual([
      'built-in-copy',
      'built-in-regenerate',
      'built-in-thumbs-up',
      'built-in-thumbs-down',
      'built-in-debug',
    ]);
  });
});
