import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { defaultCompressionSummarizer } from '../lib/utils/compression/default-summarizer';
import type { CompressionPinnedMessage } from '../lib/types/compression';

function makeMessage(id: string, role: UIMessage['role'], text: string): UIMessage {
  return {
    id,
    role,
    parts: [
      {
        type: 'text',
        text,
      } as UIMessage['parts'][number],
    ],
  } as UIMessage;
}

describe('defaultCompressionSummarizer', () => {
  it('creates a summary artifact and trims earlier turns when budget is tight', async () => {
    const messages: UIMessage[] = [
      makeMessage('m1', 'system', 'You are a helpful assistant that replies concisely.'),
      makeMessage('m2', 'user', 'Provide a detailed overview of the quarterly results focusing on revenue, profit, and churn metrics.'),
      makeMessage('m3', 'assistant', 'Sure, let me gather that data for you and walk through the highlights in a structured way.'),
      makeMessage('m4', 'user', 'Also include notable customer stories and product milestones that impacted those numbers.'),
      makeMessage('m5', 'assistant', 'Absolutely. I will synthesise the customer stories and product milestones alongside the numeric indicators so the team can review quickly.'),
      makeMessage('m6', 'user', 'Great, and do not forget to mention marketing attribution learnings in the summary.'),
      makeMessage('m7', 'assistant', 'Understood. I will add the marketing attribution insights to the final summary to ensure coverage.'),
      makeMessage('m8', 'user', 'Thanks! One more thing: highlight any risks we should watch for next quarter.'),
      makeMessage('m9', 'assistant', 'Will do. Let me prepare that summary for you now.'),
    ];

    const pinnedMessages: CompressionPinnedMessage[] = [
      {
        id: 'm2',
        message: messages[1],
        pinnedAt: Date.now() - 10,
      },
    ];

    const result = await defaultCompressionSummarizer({
      messages,
      pinnedMessages,
      budget: 120,
    });

    expect(result.artifacts.length).toBeGreaterThanOrEqual(1);
    const [artifact] = result.artifacts;
    expect(artifact.summary).toContain('Earlier conversation condensed');
    expect(artifact.sourceMessageIds).toContain('m1');
    expect(artifact.sourceMessageIds).not.toContain('m8');

    expect(result.survivingMessageIds).toContain('m2');
    expect(result.survivingMessageIds).toContain('m9');
    expect(result.survivingMessageIds).not.toContain('m1');

    expect(result.usage?.totalTokens).toBeGreaterThan(0);
  });
});
