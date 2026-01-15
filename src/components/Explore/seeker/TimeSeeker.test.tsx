import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeeker } from './TimeSeeker';
import { useTimeSeekerChartConfig } from './useTimeSeekerChartConfig';
import { dateTime, FieldType, LoadingState } from '@grafana/data';

// We mock only the heavy pieces that rely on uPlot/DOM measurement.
// Everything else runs real code to keep the test meaningful.
const mockConfigBuilder = {
  setCursor: jest.fn().mockReturnThis(),
  addAxis: jest.fn().mockReturnThis(),
  addSeries: jest.fn().mockReturnThis(),
  addHook: jest.fn().mockReturnThis(),
  getConfig: jest.fn(() => ({ series: [null, {}], scales: {} })),
};

jest.mock('./useTimeSeekerChartConfig', () => ({
  useTimeSeekerChartConfig: jest.fn(() => mockConfigBuilder),
}));

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  UPlotChart: ({ width, height }: any) => <div data-testid="uplot-main-div" data-width={width} data-height={height} />,
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  PanelDataErrorView: () => <div data-testid="error-view">Error</div>,
}));

const createMockData = (hasSeries = true) => ({
  state: LoadingState.Done,
  series: hasSeries
    ? [
        {
          name: 'test',
          fields: [
            { name: 'time', type: FieldType.time, values: [1000, 2000, 3000], config: {} },
            { name: 'value', type: FieldType.number, values: [10, 20, 30], config: {} },
          ],
          length: 3,
        },
      ]
    : [],
  timeRange: {
    from: dateTime(1000),
    to: dateTime(3000),
    raw: { from: 'now-1h', to: 'now' },
  },
});

describe('TimeSeeker', () => {
  const mockedUseTimeSeekerChartConfig = useTimeSeekerChartConfig as jest.Mock;
  const defaultProps = {
    data: createMockData(),
    width: 800,
    onChangeTimeRange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error view when no series data', () => {
    render(<TimeSeeker {...defaultProps} data={createMockData(false)} />);
    expect(screen.getByTestId('error-view')).toBeInTheDocument();
  });

  it('renders chart when series data is available', () => {
    render(<TimeSeeker {...defaultProps} />);
    expect(screen.getByTestId('uplot-main-div')).toBeInTheDocument();
  });

  it('renders control buttons', () => {
    render(<TimeSeeker {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Pan left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pan right' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in context' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out context' })).toBeInTheDocument();
  });

  it('passes metric prop correctly', () => {
    const { rerender } = render(<TimeSeeker {...defaultProps} metric="rate" />);
    expect(screen.getByTestId('uplot-main-div')).toBeInTheDocument();
    expect(mockedUseTimeSeekerChartConfig).toHaveBeenCalledWith(expect.objectContaining({ metric: 'rate' }));

    rerender(<TimeSeeker {...defaultProps} metric="errors" />);
    expect(screen.getByTestId('uplot-main-div')).toBeInTheDocument();
    expect(mockedUseTimeSeekerChartConfig).toHaveBeenCalledWith(expect.objectContaining({ metric: 'errors' }));

    rerender(<TimeSeeker {...defaultProps} metric="duration" />);
    expect(screen.getByTestId('uplot-main-div')).toBeInTheDocument();
    expect(mockedUseTimeSeekerChartConfig).toHaveBeenCalledWith(expect.objectContaining({ metric: 'duration' }));
  });
});
