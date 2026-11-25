import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyStateScene } from './EmptyStateScene';
import { testIds } from 'utils/testIds';

jest.mock('./GrotNotFound', () => ({
  GrotNotFound: ({ width }: { width: number }) => <svg width={width} />,
}));

describe('EmptyStateScene', () => {
  it('keeps the illustration, message, and remedy in the shared layout', () => {
    const model = new EmptyStateScene({
      message: 'No data for selected query',
      remedyMessage: 'Try a different query.',
      layout: 'shared',
    });

    render(<model.Component model={model} />);

    const emptyState = screen.getByTestId(testIds.emptyState);
    expect(emptyState.querySelector('svg[width="300"]')).toBeInTheDocument();
    expect(emptyState).toContainElement(screen.getByText('No data for selected query'));
    expect(screen.getByText('Try a different query.').querySelector('svg')).toBeInTheDocument();
  });

  it('keeps the compact image-only state in the local layout', () => {
    const model = new EmptyStateScene({ imgWidth: 110 });

    render(<model.Component model={model} />);

    const emptyState = screen.getByTestId(testIds.emptyState);
    expect(emptyState.querySelector('svg[width="110"]')).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('');
  });
});
