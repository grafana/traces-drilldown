import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeekerChart } from './TimeSeekerChart';
import { TimeSeekerProvider } from './TimeSeekerContext';
import { dateTime, FieldType, LoadingState } from '@grafana/data';

// Mock the chart config hook
jest.mock('./useTimeSeekerChartConfig', () => ({
  useTimeSeekerChartConfig: jest.fn(() => {
    const mockBuilder = {
      setCursor: jest.fn().mockReturnThis(),
      addAxis: jest.fn().mockReturnThis(),
      addSeries: jest.fn().mockReturnThis(),
      addHook: jest.fn().mockReturnThis(),
      getConfig: jest.fn(() => ({ series: [null, {}], scales: {} })),
    };
    return mockBuilder;
  }),
}));

// Mock Grafana UI
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  UPlotChart: ({ width, height, data }: any) => (
    <div data-testid="uplot-chart" data-width={width} data-height={height} data-points={data[0]?.length ?? 0}>
      UPlot Chart
    </div>
  ),
  UPlotConfigBuilder: jest.fn().mockImplementation(() => ({
    setCursor: jest.fn(),
    addAxis: jest.fn(),
    addSeries: jest.fn(),
    addHook: jest.fn(),
    getConfig: jest.fn(() => ({ series: [null, {}], scales: {} })),
  })),
  useTheme2: () => ({
    colors: {
      background: { primary: '#fff' },
      border: { weak: '#ccc' },
      primary: { shade: '#007bff' },
    },
    visualization: { getColorByName: (name: string) => name },
  }),
  useStyles2: (fn: Function) => fn({
    colors: { background: { primary: '#fff' }, primary: { shade: '#007bff' } },
    spacing: () => '8px',
  }),
}));

// Mock sub-components
jest.mock('./TimeSeekerDragOverlay', () => ({
  TimeSeekerDragOverlay: () => <div data-testid="drag-overlay">Drag Overlay</div>,
}));

jest.mock('./TimeSeekerLoadingOverlay', () => ({
  TimeSeekerLoadingOverlay: () => <div data-testid="loading-overlay">Loading Overlay</div>,
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

const renderWithProvider = (ui: React.ReactElement, props = {}) => {
  return render(
    <TimeSeekerProvider
      data={createMockData()}
      width={800}
      chartHeight={42}
      onChangeTimeRange={jest.fn()}
      {...props}
    >
      {ui}
    </TimeSeekerProvider>
  );
};

describe('TimeSeekerChart', () => {
  it('renders UPlotChart with correct dimensions', () => {
    renderWithProvider(<TimeSeekerChart />);

    const chart = screen.getByTestId('uplot-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-width', '800');
    expect(chart).toHaveAttribute('data-height', '42');
  });

  it('renders drag overlay', () => {
    renderWithProvider(<TimeSeekerChart />);

    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });

  it('renders loading overlay', () => {
    renderWithProvider(<TimeSeekerChart />);

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
  });

  it('passes data to UPlotChart', () => {
    renderWithProvider(<TimeSeekerChart />);

    const chart = screen.getByTestId('uplot-chart');
    expect(chart).toHaveAttribute('data-points', '3');
  });

  it('renders container with correct width and height', () => {
    const { container } = renderWithProvider(<TimeSeekerChart />);

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveStyle({ width: '800px', height: '42px' });
  });
});

