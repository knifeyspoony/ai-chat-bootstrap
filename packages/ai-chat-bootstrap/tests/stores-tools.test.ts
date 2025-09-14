import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { useAIToolsStore } from '../lib/stores/tools';

describe('useAIToolsStore', () => {
  beforeEach(() => {
    useAIToolsStore.setState({ tools: new Map() });
  });

  it('registers and retrieves tools', () => {
    const tool = { name: 'sum', description: 'add', parameters: z.object({ a: z.number(), b: z.number() }), execute: ({ a, b }) => a + b };
    useAIToolsStore.getState().registerTool(tool as any);
    expect(useAIToolsStore.getState().getTool('sum')).toBeTruthy();
    expect(useAIToolsStore.getState().getAllTools()).toHaveLength(1);
  });

  it('executes tool with validated params and throws on invalid', async () => {
    const tool = { name: 'sum', description: 'add', parameters: z.object({ a: z.number(), b: z.number() }), execute: ({ a, b }) => a + b };
    useAIToolsStore.getState().registerTool(tool as any);
    await expect(useAIToolsStore.getState().executeTool('sum', { a: 2, b: 3 })).resolves.toBe(5);
    await expect(useAIToolsStore.getState().executeTool('sum', { a: '2', b: 3 } as any)).rejects.toThrow();
  });

  it('serializes tools for backend using provider-utils schema', () => {
    const tool = { name: 'sum', description: 'add', parameters: z.object({ a: z.number(), b: z.number() }), execute: ({ a, b }) => a + b };
    useAIToolsStore.getState().registerTool(tool as any);
    const serialized = useAIToolsStore.getState().serializeToolsForBackend();
    expect(serialized).toHaveLength(1);
    expect(serialized[0]).toMatchObject({ name: 'sum', description: 'add' });
    expect(serialized[0].inputSchema).toBeTypeOf('object');
  });

  it('unregisters tools', () => {
    const tool = { name: 'noop', description: 'n', parameters: z.object({}), execute: () => {} };
    useAIToolsStore.getState().registerTool(tool as any);
    useAIToolsStore.getState().unregisterTool('noop');
    expect(useAIToolsStore.getState().getTool('noop')).toBeUndefined();
  });

  it('throws on missing tool execution', async () => {
    await expect(useAIToolsStore.getState().executeTool('missing', {})).rejects.toThrow();
  });
});

