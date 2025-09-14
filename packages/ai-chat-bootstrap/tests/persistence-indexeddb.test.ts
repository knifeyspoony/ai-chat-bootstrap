import { describe, it, expect } from 'vitest';
import { getDefaultChatThreadPersistence } from '../lib/persistence/chat-threads-indexeddb';

describe('IndexedDB persistence (node env)', () => {
  it('returns undefined by default in non-browser environment', () => {
    const p = getDefaultChatThreadPersistence();
    expect(p).toBeUndefined();
  });
});

