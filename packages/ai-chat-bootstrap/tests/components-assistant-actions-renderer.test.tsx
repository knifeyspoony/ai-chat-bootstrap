// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { UIMessage } from 'ai';

vi.mock('../lib/components/ai-elements/actions', () => {
  return {
    Actions: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'actions-container' }, children),
    Action: ({
      children,
      label,
      tooltip,
      ...props
    }: {
      children: React.ReactNode;
      label?: string;
      tooltip?: string;
      disabled?: boolean;
      onClick?: React.MouseEventHandler<HTMLButtonElement>;
    }) =>
      React.createElement(
        'button',
        {
          type: 'button',
          'aria-label': label ?? tooltip,
          ...props,
        },
        children
      ),
  };
});

import { AssistantActionsRenderer } from '../lib/components/chat/assistant-actions-renderer';
import type { AssistantAction } from '../lib/types/actions';

const message: UIMessage = {
  id: 'assistant-1',
  role: 'assistant',
  parts: [{ type: 'text', text: 'Hello there' }],
};

const TestIcon: React.FC<{ className?: string }> = (props) => <svg data-testid="icon" {...props} />;

afterEach(() => {
  cleanup();
});

describe('AssistantActionsRenderer', () => {
  it('renders provided actions and triggers click handlers with the message', () => {
    const onClick = vi.fn();
    const actions: AssistantAction[] = [
      {
        id: 'approve',
        icon: TestIcon,
        label: 'Approve',
        onClick,
      },
    ];

    render(
      <AssistantActionsRenderer
        message={message}
        actionsConfig={actions}
        isLatestAssistant
      />
    );

    const button = screen.getByRole('button', { name: 'Approve' });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith(message);
  });

  it('disables actions when the disabled predicate returns true', () => {
    const actions: AssistantAction[] = [
      {
        id: 'disabled-action',
        icon: TestIcon,
        label: 'Disabled',
        onClick: vi.fn(),
        disabled: () => true,
      },
    ];

    render(
      <AssistantActionsRenderer
        message={message}
        actionsConfig={actions}
        isLatestAssistant
      />
    );

    const button = screen.getByRole('button', { name: 'Disabled' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('filters actions when not the latest assistant message or visibility returns false', () => {
    const actions: AssistantAction[] = [
      {
        id: 'latest-only',
        icon: TestIcon,
        label: 'Latest',
        onClick: vi.fn(),
        onlyOnMostRecent: true,
      },
      {
        id: 'invisible',
        icon: TestIcon,
        label: 'Invisible',
        onClick: vi.fn(),
        visible: () => false,
      },
    ];

    const { rerender } = render(
      <AssistantActionsRenderer
        message={message}
        actionsConfig={actions}
        isLatestAssistant={false}
      />
    );

    expect(screen.queryByRole('button', { name: 'Latest' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Invisible' })).toBeNull();

    rerender(
      <AssistantActionsRenderer
        message={message}
        actionsConfig={actions}
        isLatestAssistant
      />
    );

    const latestButton = screen.getByRole('button', { name: 'Latest' });
    expect(latestButton).toBeDefined();
  });

  it('supports functional action configuration', () => {
    const onClick = vi.fn();

    render(
      <AssistantActionsRenderer
        message={message}
        actionsConfig={(msg) => [
          {
            id: `echo-${msg.id}`,
            icon: TestIcon,
            label: 'Echo',
            onClick,
          },
        ]}
        isLatestAssistant
      />
    );

    const button = screen.getByRole('button', { name: 'Echo' });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledWith(message);
  });
});
