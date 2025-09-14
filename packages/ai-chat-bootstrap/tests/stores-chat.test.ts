import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../lib/stores/chat';
import type { UIMessage } from 'ai';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      input: '',
      isLoading: false,
      error: null,
      toolResults: new Map(),
    });
  });

  it('adds and clears messages', () => {
    const msg: UIMessage = { id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] } as any;
    useChatStore.getState().addMessage(msg);
    expect(useChatStore.getState().messages).toHaveLength(1);
    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('sets input/loading/error', () => {
    useChatStore.getState().setInput('abc');
    expect(useChatStore.getState().input).toBe('abc');
    useChatStore.getState().setLoading(true);
    expect(useChatStore.getState().isLoading).toBe(true);
    useChatStore.getState().setError('oops');
    expect(useChatStore.getState().error).toBe('oops');
  });

  it('stores and retrieves tool results by id', () => {
    useChatStore.getState().setToolResult('call-1', { ok: true });
    expect(useChatStore.getState().getToolResult('call-1')).toEqual({ ok: true });
    expect(useChatStore.getState().getToolResult('missing')).toBeUndefined();
  });
});

