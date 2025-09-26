// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from '../lib/components/ai-elements/branch';

const BranchFixture = () => (
  <Branch defaultBranch={2}>
    <BranchMessages>
      <div data-testid="branch-content">Branch version 1</div>
      <div data-testid="branch-content">Branch version 2</div>
      <div data-testid="branch-content">Branch version 3</div>
    </BranchMessages>
    <BranchSelector from="assistant" alignment="inline">
      <BranchPrevious />
      <BranchPage data-testid="branch-page" />
      <BranchNext />
    </BranchSelector>
  </Branch>
);

describe('Branch selector', () => {
  it('updates the page indicator when switching branches', () => {
    render(<BranchFixture />);

    const pageIndicator = screen.getByTestId('branch-page');
    expect(pageIndicator.textContent).toBe('3 of 3');

    fireEvent.click(screen.getByLabelText('Previous branch'));
    expect(pageIndicator.textContent).toBe('2 of 3');

    fireEvent.click(screen.getByLabelText('Previous branch'));
    expect(pageIndicator.textContent).toBe('1 of 3');

    fireEvent.click(screen.getByLabelText('Next branch'));
    expect(pageIndicator.textContent).toBe('2 of 3');
  });
});
