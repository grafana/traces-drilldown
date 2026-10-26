import React, { useLayoutEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeekerLoadingOverlay } from './TimeSeekerLoadingOverlay';
import { TimeSeekerProvider, useTimeSeeker } from './TimeSeekerContext';
import { dateTime, FieldType, LoadingState } from '@grafana/data';

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
    raw: { from: 'now-1h', to: 'now' },
  },
});

interface TestProviderProps {
  loadingRanges?: Array<{ from: number; to: number }>;
  plot?: uPlot;
}

const MockPlot = ({ plot }: { plot: uPlot }) => {
  const { uplotRef } = useTimeSeeker();

  useLayoutEffect(() => {
    uplotRef.current = plot;
    return () => {
      uplotRef.current = null;
    };
  }, [plot, uplotRef]);

  return null;
};

const TestProvider = ({ loadingRanges, plot }: TestProviderProps) => (
  <TimeSeekerProvider
    data={createMockData()}
    width={800}
    chartHeight={42}
    onChangeTimeRange={jest.fn()}
    initialVisibleRange={{ from: 0, to: 10000 }}
    loadingRanges={loadingRanges}
  >
    {plot && <MockPlot plot={plot} />}
    <TimeSeekerLoadingOverlay />
  </TimeSeekerProvider>
);

const renderWithProvider = (loadingRanges?: Array<{ from: number; to: number }>, plot?: uPlot) => {
  return render(<TestProvider loadingRanges={loadingRanges} plot={plot} />);
};

const createMockPlot = () =>
  ({
    valToPos: (value: number) => value / 10,
    bbox: { left: 25, top: 0, width: 800, height: 42 },
  }) as unknown as uPlot;

describe('TimeSeekerLoadingOverlay', () => {
  it('returns null when loadingRanges is undefined', () => {
    const { container } = renderWithProvider(undefined);

    const overlays = container.querySelectorAll('.loading-overlay-class');
    expect(overlays.length).toBe(0);
  });

  it('returns null when loadingRanges is empty', () => {
    const { container } = renderWithProvider([]);

    const overlays = container.querySelectorAll('.loading-overlay-class');
    expect(overlays.length).toBe(0);
  });

  it('renders without crashing when loadingRanges has values', () => {
    // Since UPlot is mocked and uplotRef is not set, rendering will return null for each range
    // This is expected behavior - in real usage, uplot would be initialized
    const { container } = renderWithProvider([
      { from: 100, to: 200 },
      { from: 300, to: 400 },
    ]);

    // Without uplot ref, it won't render actual overlays
    // This tests that the component handles the case gracefully
    expect(container).toBeTruthy();
  });

  it('should show loading indicators only for ranges with a positive measured width', () => {
    renderWithProvider(
      [
        { from: 100, to: 100 },
        { from: 300, to: 200 },
        { from: 400, to: 600 },
      ],
      createMockPlot()
    );

    expect(screen.getAllByTestId('time-seeker-loading-overlay')).toHaveLength(1);
    expect(screen.getByTestId('time-seeker-loading-overlay')).toBeVisible();
  });

  it('should remove completed loading indicators when pending ranges change', () => {
    const plot = createMockPlot();
    const { rerender } = renderWithProvider(
      [
        { from: 100, to: 200 },
        { from: 300, to: 500 },
      ],
      plot
    );

    expect(screen.getAllByTestId('time-seeker-loading-overlay')).toHaveLength(2);

    rerender(<TestProvider loadingRanges={[{ from: 600, to: 900 }]} plot={plot} />);

    expect(screen.getAllByTestId('time-seeker-loading-overlay')).toHaveLength(1);
    expect(screen.getByTestId('time-seeker-loading-overlay')).toBeVisible();

    rerender(<TestProvider loadingRanges={[]} plot={plot} />);

    expect(screen.queryByTestId('time-seeker-loading-overlay')).not.toBeInTheDocument();
  });
});
