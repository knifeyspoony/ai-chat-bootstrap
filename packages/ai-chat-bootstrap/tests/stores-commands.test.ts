import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { useAIChatCommandsStore } from '../lib/stores/commands';

describe('useAIChatCommandsStore', () => {
  beforeEach(() => {
    useAIChatCommandsStore.setState({ commands: new Map() });
  });

  it('registers, gets, and unregisters commands', () => {
    useAIChatCommandsStore.getState().registerCommand({
      type: 'ui',
      name: 'hello',
      description: 'say hello',
      parameters: z.object({ name: z.string() }),
      execute: () => {},
    });
    expect(useAIChatCommandsStore.getState().getCommand('hello')).toBeTruthy();
    useAIChatCommandsStore.getState().unregisterCommand('hello');
    expect(useAIChatCommandsStore.getState().getCommand('hello')).toBeUndefined();
  });

  it('lists matching commands by name/description and sorts by name', () => {
    const s = useAIChatCommandsStore.getState();
    s.registerCommand({ type: 'ui', name: 'Alpha', description: 'first', parameters: z.object({}), execute: () => {} });
    s.registerCommand({ type: 'ui', name: 'beta', description: 'second', parameters: z.object({}), execute: () => {} });
    s.registerCommand({ type: 'ui', name: 'gamma', description: 'third', parameters: z.object({}), execute: () => {} });
    const matches = useAIChatCommandsStore.getState().getMatchingCommands('a');
    expect(matches.map(m => m.name)).toEqual(['Alpha', 'beta', 'gamma']);
  });

  it('executes UI command with validated params and errors on invalid', async () => {
    let executed: any = null;
    useAIChatCommandsStore.getState().registerCommand({
      type: 'ui',
      name: 'set-flag',
      description: 'toggle flag',
      parameters: z.object({ flag: z.boolean() }),
      execute: (p) => { executed = p; },
    });
    await useAIChatCommandsStore.getState().executeCommand('set-flag', { flag: true });
    expect(executed).toEqual({ flag: true });
    await expect(useAIChatCommandsStore.getState().executeCommand('set-flag', { flag: 'nope' as any })).rejects.toThrow();
  });

  it('throws when executing AI command directly', async () => {
    useAIChatCommandsStore.getState().registerCommand({
      type: 'ai',
      name: 'search',
      toolName: 'webSearch',
      description: 'search the web',
      parameters: z.object({ q: z.string() }),
    });
    await expect(useAIChatCommandsStore.getState().executeCommand('search', { q: 'x' })).rejects.toThrow();
  });

  it('errors on missing command', async () => {
    await expect(useAIChatCommandsStore.getState().executeCommand('nope', {})).rejects.toThrow();
  });
});

