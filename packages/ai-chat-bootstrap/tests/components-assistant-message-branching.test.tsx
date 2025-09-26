// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';

import { reorderBranchEntriesForSelection } from '../lib/components/chat/assistant-message-helpers';
import type { AssistantBranchEntry } from '../lib/components/chat/assistant-branches';

const createEntry = (id: string, parts: string, label: string): AssistantBranchEntry => ({
  key: id,
  message: {
    id,
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: parts,
      },
    ],
  },
  content: <div data-label={label} />, 
});

describe('reorderBranchEntriesForSelection', () => {
  it('moves the canonical entry to the stored branch index when necessary', () => {
    const canonical = createEntry('assistant-1', 'canonical', 'canonical');
    const demoted = createEntry('assistant-1::v2', 'demoted', 'demoted');

    const result = reorderBranchEntriesForSelection({
      entries: [demoted, canonical],
      messageId: canonical.message.id,
      branchingEnabled: true,
      selectedBranchIndex: 0,
    });

    expect(result[0].message.id).toBe('assistant-1');
    expect(result[1].message.id).toBe('assistant-1::v2');
  });

  it('returns the original ordering when branching is disabled', () => {
    const canonical = createEntry('assistant-1', 'canonical', 'canonical');
    const demoted = createEntry('assistant-1::v2', 'demoted', 'demoted');

    const result = reorderBranchEntriesForSelection({
      entries: [demoted, canonical],
      messageId: canonical.message.id,
      branchingEnabled: false,
      selectedBranchIndex: 0,
    });

    expect(result).toEqual([demoted, canonical]);
  });
});
