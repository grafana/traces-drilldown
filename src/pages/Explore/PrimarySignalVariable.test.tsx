import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrimarySignalVariable } from './PrimarySignalVariable';
import { primarySignalOptions } from './primary-signals';
import { testIds } from 'utils/testIds';

// The shared SVG mock discards DOM props; preserve them without fetching icon assets.
jest.mock('react-inlinesvg', () => ({
  __esModule: true,
  default: ({ src, preProcessor, innerRef, ...props }: any) => <svg ref={innerRef} {...props} />,
}));

jest.mock('utils/analytics', () => ({
  reportAppInteraction: jest.fn(),
  USER_EVENTS_PAGES: { analyse_traces: 'analyse_traces' },
  USER_EVENTS_ACTIONS: { analyse_traces: { primary_signal_changed: 'primary_signal_changed' } },
}));

it('opens the primary signal menu through its visible indicator anchor and selects a signal', async () => {
  const user = userEvent.setup();
  const model = new PrimarySignalVariable({ name: 'primarySignal', value: primarySignalOptions[0].value });
  const changeValue = jest.spyOn(model, 'changeValueTo');
  render(<model.Component model={model} />);

  const indicator = screen.getByTestId(testIds.primarySignalSelect);
  expect(indicator.tagName.toLowerCase()).toBe('svg');
  expect(screen.queryByText('Server spans')).not.toBeInTheDocument();
  await user.click(indicator);
  await user.click(await screen.findByText('Server spans'));
  expect(changeValue).toHaveBeenCalledWith('kind=server', undefined, true);
});
