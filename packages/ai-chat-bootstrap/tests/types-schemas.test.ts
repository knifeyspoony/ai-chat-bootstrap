import { describe, it, expect } from 'vitest';
import { SuggestionsSchema } from '../lib/types/chat';

describe('SuggestionsSchema', () => {
  it('accepts 3-5 suggestions', () => {
    const valid = {
      suggestions: Array.from({ length: 3 }, (_, i) => ({
        reasoning: `r${i}`,
        shortSuggestion: `s${i}`,
        longSuggestion: `l${i}`,
      })),
    };
    expect(() => SuggestionsSchema.parse(valid)).not.toThrow();

    const five = {
      suggestions: Array.from({ length: 5 }, (_, i) => ({
        reasoning: `r${i}`,
        shortSuggestion: `s${i}`,
        longSuggestion: `l${i}`,
      })),
    };
    expect(() => SuggestionsSchema.parse(five)).not.toThrow();
  });

  it('rejects fewer than 3', () => {
    const invalid = {
      suggestions: [
        { reasoning: 'r0', shortSuggestion: 's0', longSuggestion: 'l0' },
        { reasoning: 'r1', shortSuggestion: 's1', longSuggestion: 'l1' },
      ],
    };
    expect(() => SuggestionsSchema.parse(invalid)).toThrow();
  });

  it('rejects more than 5', () => {
    const invalid = {
      suggestions: Array.from({ length: 6 }, (_, i) => ({
        reasoning: `r${i}`,
        shortSuggestion: `s${i}`,
        longSuggestion: `l${i}`,
      })),
    };
    expect(() => SuggestionsSchema.parse(invalid)).toThrow();
  });
});

