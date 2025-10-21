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

  it('always mentions MCP in preamble regardless of tool presence', () => {
    const text = buildEnrichedSystemPrompt({
      tools: [
        { name: 'local-tool', description: 'A local tool', source: 'frontend' },
      ],
    });

    // MCP is always mentioned in the preamble to educate the AI about MCP capabilities
    expect(text).toMatch(/Model Context Protocol/);
    expect(text).toMatch(/including tools from MCP servers/);
  });

  it('includes detailed MCP explanation in Tools section when MCP tools are present', () => {
    const text = buildEnrichedSystemPrompt({
      tools: [
        { name: 'local-tool', description: 'A local tool', source: 'frontend' },
        { name: 'mcp-tool', description: 'An MCP tool', source: 'mcp' },
      ],
    });

    expect(text).toMatch(/## Tools/);
    // Preamble mention
    expect(text).toMatch(/Model Context Protocol/);
    // Detailed explanation in Tools section
    expect(text).toMatch(/a standard that exposes remote data and actions/i);
    expect(text).toMatch(/\[MCP\] \*\*mcp-tool\*\*: An MCP tool/);
  });

  it('does not add [MCP] prefix to frontend tools', () => {
    const text = buildEnrichedSystemPrompt({
      tools: [
        { name: 'local-tool', description: 'A local tool', source: 'frontend' },
      ],
    });

    expect(text).toMatch(/## Tools/);
    expect(text).not.toMatch(/\[MCP\]/);
    expect(text).toMatch(/\*\*local-tool\*\*: A local tool/);
  });

  it('marks MCP tools with [MCP] prefix', () => {
    const text = buildEnrichedSystemPrompt({
      tools: [
        { name: 'tool1', description: 'Frontend tool', source: 'frontend' },
        { name: 'tool2', description: 'MCP tool 1', source: 'mcp' },
        { name: 'tool3', description: 'MCP tool 2', source: 'mcp' },
        { name: 'tool4', description: 'Backend tool' }, // no source specified
      ],
    });

    expect(text).toMatch(/- \*\*tool1\*\*: Frontend tool/);
    expect(text).toMatch(/- \[MCP\] \*\*tool2\*\*: MCP tool 1/);
    expect(text).toMatch(/- \[MCP\] \*\*tool3\*\*: MCP tool 2/);
    expect(text).toMatch(/- \*\*tool4\*\*: Backend tool/);
  });

  it('includes MCP mention even without tools', () => {
    const text = buildEnrichedSystemPrompt({
      originalSystemPrompt: 'Test prompt',
    });

    // MCP is mentioned in preamble even when no tools are provided
    expect(text).toMatch(/Model Context Protocol/);
    expect(text).toMatch(/connects you to external data sources/);
  });

  it('handles tools without descriptions', () => {
    const text = buildEnrichedSystemPrompt({
      tools: [
        { name: 'tool-no-desc', source: 'mcp' },
      ],
    });

    expect(text).toMatch(/\[MCP\] \*\*tool-no-desc\*\*/);
  });

  it('handles custom tool sources', () => {
    const text = buildEnrichedSystemPrompt({
      tools: [
        { name: 'custom-tool', description: 'Custom source', source: 'custom-source' },
      ],
    });

    expect(text).not.toMatch(/\[MCP\]/);
    expect(text).toMatch(/\*\*custom-tool\*\*: Custom source/);
  });
});

