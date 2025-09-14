import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('utils.cn', () => {
  it('merges class names and removes duplicates', () => {
    const result = cn('px-2', 'py-1', 'px-2', false && 'hidden');
    const parts = result.split(' ').sort();
    expect(parts).toEqual(['px-2', 'py-1'].sort());
  });

  it('merges tailwind conflicting classes with tailwind-merge', () => {
    const result = cn('p-2', 'p-4', 'text-sm', 'text-base');
    expect(result).toBe('p-4 text-base');
  });
});
