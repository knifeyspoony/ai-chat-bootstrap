import { describe, it, expect } from 'vitest';
import { buildEnrichedSystemPrompt } from '../lib/utils/prompt-utils';

describe('buildEnrichedSystemPrompt', () => {
  it('includes sections only when data present and preserves order', () => {
    const text = buildEnrichedSystemPrompt({
      originalSystemPrompt: 'ORIGINAL',
      tools: [{ name: 'search', description: 'find things' }],
      context: [
        { id: 'c1', text: 'Low', priority: 1 },
        { id: 'c2', text: 'High', priority: 10 },
      ],
      focus: [
        { id: 'f1', label: 'Doc 1', description: 'A file' },
      ],
    });
    // Headers
    expect(text).toMatch(/# Enhanced Chat System/);
    expect(text).toMatch(/## Tools[\s\S]*- \*\*search\*\*: find things/);
    // Context sorted by priority desc
    const contextSection = text.split('## Context')[1];
    expect(contextSection).toMatch(/High[\s\S]*Low/);
    // Focus contains label and description
    expect(text).toMatch(/## Focus[\s\S]*\*\*Doc 1\*\*: A file/);
    // Original at bottom with divider
    expect(text).toMatch(/Original System Prompt[\s\S]*ORIGINAL\s*$/);
  });

  it('omits tools/context/focus when not present', () => {
    const text = buildEnrichedSystemPrompt({ originalSystemPrompt: '' });
    expect(text).not.toMatch(/## Tools/);
    expect(text).not.toMatch(/## Context/);
    expect(text).not.toMatch(/## Focus/);
  });
});

