import { describe, it, expect } from 'vitest';
import { deserializeFrontendTools } from '../lib/utils/backend-tool-utils';

describe('deserializeFrontendTools', () => {
  it('returns empty record when input is empty or null', () => {
    expect(deserializeFrontendTools()).toEqual({});
    // @ts-expect-error Testing null input for error handling
    expect(deserializeFrontendTools(null)).toEqual({});
    expect(deserializeFrontendTools([])).toEqual({});
  });

  it('creates backend tool definitions keyed by name', () => {
    const tools = deserializeFrontendTools([
      {
        name: 'sum',
        description: 'add two',
        inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] },
      },
    ] as any);
    expect(Object.keys(tools)).toEqual(['sum']);
    expect(tools['sum']).toBeTruthy();
  });
});

