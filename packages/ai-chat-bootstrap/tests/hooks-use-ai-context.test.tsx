// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { useAIContext } from '../lib/hooks/use-ai-context';
import { useAIContextStore } from '../lib/stores';

function ContextHookWrapper({
  description,
  value,
  available = 'enabled' as const,
  categories,
  parentId,
  priority,
}: {
  description: string;
  value: any;
  available?: 'enabled' | 'disabled';
  categories?: string[];
  parentId?: string;
  priority?: number;
}) {
  // Re-run effect when value changes to simulate dependencies
  useAIContext(
    { description, value, available, categories, parentId, priority },
    [value]
  );
  return null;
}

describe('useAIContext hook', () => {
  beforeEach(() => {
    cleanup();
    useAIContextStore.getState().clearContext();
  });

  it('does not register when available is disabled', () => {
    render(
      <ContextHookWrapper description="User profile" value={{ id: 1 }} available="disabled" />
    );

    const items = useAIContextStore.getState().listContext();
    expect(items.length).toBe(0);
  });

  it('registers context on mount and removes on unmount', () => {
    const { unmount } = render(
      <ContextHookWrapper description="Selection" value="Item A" priority={5} />
    );

    const itemsAfterMount = useAIContextStore.getState().listContext();
    expect(itemsAfterMount.length).toBe(1);
    expect(itemsAfterMount[0].description).toBe('Selection');
    expect(itemsAfterMount[0].text).toContain('Selection: Item A');
    expect(itemsAfterMount[0].priority).toBe(5);

    unmount();

    const itemsAfterUnmount = useAIContextStore.getState().listContext();
    expect(itemsAfterUnmount.length).toBe(0);
  });

  it('updates item on dependency change (new id, new text)', () => {
    const { rerender } = render(
      <ContextHookWrapper description="Cursor" value={10} />
    );

    const first = useAIContextStore.getState().listContext();
    expect(first.length).toBe(1);
    const firstItem = first[0];
    expect(firstItem.text).toContain('Cursor: 10');

    rerender(<ContextHookWrapper description="Cursor" value={11} />);

    const second = useAIContextStore.getState().listContext();
    expect(second.length).toBe(1);
    const secondItem = second[0];
    expect(secondItem.text).toContain('Cursor: 11');
    expect(secondItem.id).not.toBe(firstItem.id);
  });
});

