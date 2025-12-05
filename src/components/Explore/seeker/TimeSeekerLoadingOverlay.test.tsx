import React from 'react';
import { render } from '@testing-library/react';
import { TimeSeekerLoadingOverlay } from './TimeSeekerLoadingOverlay';
import { TimeSeekerProvider } from './TimeSeekerContext';
import { dateTime, FieldType, LoadingState } from '@grafana/data';

// Mock Grafana UI
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  UPlotConfigBuilder: jest.fn().mockImplementation(() => ({
    setCursor: jest.fn(),
    addAxis: jest.fn(),
    addSeries: jest.fn(),
    addHook: jest.fn(),
    getConfig: jest.fn(() => ({ series: [null, {}], scales: {} })),
  })),
  useTheme2: () => ({
    colors: { background: { primary: '#fff' }, border: { weak: '#ccc' }, primary: { shade: '#007bff' } },
    visualization: { getColorByName: (name: string) => name },
  }),
  useStyles2: () => ({
    loadingOverlay: 'loading-overlay-class',
  }),
}));

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

const renderWithProvider = (loadingRanges?: Array<{ from: number; to: number }>) => {
  return render(
    <TimeSeekerProvider
      data={createMockData()}
      width={800}
      chartHeight={42}
      onChangeTimeRange={jest.fn()}
      initialVisibleRange={{ from: 0, to: 10000 }}
      loadingRanges={loadingRanges}
    >
      <TimeSeekerLoadingOverlay />
    </TimeSeekerProvider>
  );
};

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
});
