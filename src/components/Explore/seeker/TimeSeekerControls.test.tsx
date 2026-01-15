import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { TimeSeekerControls } from './TimeSeekerControls';
import { TimeSeekerProvider, useTimeSeeker } from './TimeSeekerContext';
import { dateTime, FieldType, LoadingState } from '@grafana/data';

// Mock Grafana UI components
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  IconButton: ({ tooltip, onClick, children, ...rest }: any) => (
    <button aria-label={tooltip} onClick={onClick} {...rest}>
      {children ?? tooltip}
    </button>
  ),
  TimeRangeInput: ({ value, onChange }: any) => (
    <div data-testid="time-range-input">
      <button onClick={() => onChange?.(value)}>Time Range</button>
    </div>
  ),
}));

const StateViewer = () => {
  const { visibleRange, timelineRange } = useTimeSeeker();

  return (
    <div>
      <div data-testid="visible-range">{`${visibleRange.from},${visibleRange.to}`}</div>
      <div data-testid="timeline-range">{`${timelineRange.from},${timelineRange.to}`}</div>
    </div>
  );
};

const expectVisibleRange = (from: number, to: number) => {
  const content = screen.getByTestId('visible-range').textContent ?? '';
  const [currentFrom, currentTo] = content.split(',').map(Number);

  expect(currentFrom).toBeCloseTo(from);
  expect(currentTo).toBeCloseTo(to);
};

const createMockData = () => ({
  state: LoadingState.Done,
  series: [
    {
      name: 'test',
      fields: [
        { name: 'time', type: FieldType.time, values: [1000, 2000, 3000], config: {} },
        { name: 'value', type: FieldType.number, values: [10, 20, 30], config: {} },
      ],
      length: 3,
    },
  ],
  timeRange: {
    from: dateTime(1000),
    to: dateTime(3000),
    raw: { from: dateTime(1000), to: dateTime(3000) },
  },
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <TimeSeekerProvider
      data={createMockData()}
      width={800}
      chartHeight={42}
      onChangeTimeRange={jest.fn()}
      initialVisibleRange={{ from: 0, to: 10000 }}
    >
      <>
        {ui}
        <StateViewer />
      </>
    </TimeSeekerProvider>
  );
};

describe('TimeSeekerControls', () => {
  it('renders all control buttons', () => {
    renderWithProvider(<TimeSeekerControls />);

    expect(screen.getByRole('button', { name: 'Pan left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pan right' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in context' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out context' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Focus selection' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set range' })).toBeInTheDocument();
  });

  it('calls panContextWindow when pan left is clicked', async () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Pan left' }));

    await waitFor(() => expectVisibleRange(-2500, 7500));
  });

  it('calls panContextWindow when pan right is clicked', async () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Pan right' }));

    await waitFor(() => expectVisibleRange(2500, 12500));
  });

  it('calls zoomContextWindow with 0.5 when zoom in is clicked', async () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in context' }));

    await waitFor(() => expectVisibleRange(2500, 7500));
  });

  it('calls zoomContextWindow with 2 when zoom out is clicked', async () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom out context' }));

    await waitFor(() => expectVisibleRange(-5000, 15000));
  });

  it('calls resetContextWindow when reset is clicked', async () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Focus selection' }));

    await waitFor(() => expectVisibleRange(-6000, 10000));
  });

  it('renders time range input component', () => {
    renderWithProvider(<TimeSeekerControls />);

    expect(screen.getByTestId('time-range-input')).toBeInTheDocument();
  });
});
