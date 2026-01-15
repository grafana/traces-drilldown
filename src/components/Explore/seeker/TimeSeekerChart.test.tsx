import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeekerChart } from './TimeSeekerChart';
import { TimeSeekerProvider } from './TimeSeekerContext';
import { dateTime, FieldType, LoadingState } from '@grafana/data';

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  UPlotChart: ({ width, height, data }: any) => (
    <div data-testid="uplot-main-div" data-width={width} data-height={height} data-points={data?.[0]?.length ?? 0} />
  ),
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
    <TimeSeekerProvider data={createMockData()} width={800} chartHeight={42} onChangeTimeRange={jest.fn()} {...props}>
      {ui}
    </TimeSeekerProvider>
  );
};

describe('TimeSeekerChart', () => {
  it('renders UPlotChart with correct dimensions', () => {
    renderWithProvider(<TimeSeekerChart />);

    const chart = screen.getByTestId('uplot-main-div');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-width', '800');
    expect(chart).toHaveAttribute('data-height', '42');
  });

  it('passes data to UPlotChart', () => {
    renderWithProvider(<TimeSeekerChart />);

    const chart = screen.getByTestId('uplot-main-div');
    expect(chart).toHaveAttribute('data-points', '3');
  });

  it('renders container with correct width and height', () => {
    const { container } = renderWithProvider(<TimeSeekerChart />);

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveStyle({ width: '800px', height: '42px' });
  });
});
