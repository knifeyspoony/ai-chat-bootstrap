import { describe, it, expect, beforeEach } from 'vitest';
import { useAIContextStore } from '../lib/stores/context';
import { useAIFocusStore } from '../lib/stores/focus';

describe('useAIContextStore', () => {
  beforeEach(() => {
    useAIContextStore.setState({ contextItems: new Map() });
  });

  it('sets, lists (priority sorted), and serializes context', () => {
    const s = useAIContextStore.getState();
    s.setContextItem({ id: 'a', text: 'Low', priority: 1 });
    s.setContextItem({ id: 'b', text: 'High', priority: 10 });
    s.setContextItem({ id: 'c', text: 'Mid', priority: 5 });
    expect(s.getContextItem('b')?.text).toBe('High');
    const list = s.listContext();
    expect(list.map(i => i.id)).toEqual(['b', 'c', 'a']);
    expect(s.serialize().map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('removes and clears context', () => {
    const s = useAIContextStore.getState();
    s.setContextItem({ id: 'x', text: 'X' });
    s.removeContextItem('x');
    expect(s.getContextItem('x')).toBeUndefined();
    s.setContextItem({ id: 'y', text: 'Y' });
    s.clearContext();
    expect(s.listContext()).toHaveLength(0);
  });
});

describe('useAIFocusStore', () => {
  beforeEach(() => {
    useAIFocusStore.setState({ focusItems: new Map() });
  });

  it('sets focus with normalization and retrieves data', () => {
    const s = useAIFocusStore.getState();
    s.setFocus('id1', { id: 'id1', label: 'Label', description: 'Desc', data: { a: 1 } });
    const item = s.getFocus('id1');
    expect(item?.label).toBe('Label');
    expect(s.getAllFocusItems()).toHaveLength(1);
    expect(s.getFocusedIds()).toEqual(['id1']);
    expect(s.hasFocusedItems()).toBe(true);
    expect(s.serialize()).toMatchObject({ id1: { id: 'id1' } });
  });

  it('clears single and all focus items', () => {
    const s = useAIFocusStore.getState();
    s.setFocus('id1', { id: 'id1' });
    s.setFocus('id2', { id: 'id2' });
    s.clearFocus('id1');
    expect(s.getFocus('id1')).toBeUndefined();
    s.clearAllFocus();
    expect(s.getAllFocusItems()).toHaveLength(0);
    expect(s.hasFocusedItems()).toBe(false);
  });
});

