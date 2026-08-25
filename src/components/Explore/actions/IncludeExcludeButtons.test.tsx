import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';

import { IncludeExcludeButtons } from './IncludeExcludeButtons';

describe('IncludeExcludeButtons', () => {
  it('should render both buttons and call the matching handler', () => {
    const onInclude = jest.fn();
    const onExclude = jest.fn();

    render(<IncludeExcludeButtons onInclude={onInclude} onExclude={onExclude} />);

    fireEvent.click(screen.getByRole('button', { name: 'Include' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exclude' }));

    expect(onInclude).toHaveBeenCalledTimes(1);
    expect(onExclude).toHaveBeenCalledTimes(1);
  });

  it('should hide buttons when requested', () => {
    render(<IncludeExcludeButtons onInclude={jest.fn()} onExclude={jest.fn()} showInclude={false} />);

    expect(screen.queryByRole('button', { name: 'Include' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exclude' })).toBeInTheDocument();
  });

  it('should render nothing when both buttons are hidden', () => {
    const { container } = render(
      <IncludeExcludeButtons onInclude={jest.fn()} onExclude={jest.fn()} showInclude={false} showExclude={false} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
