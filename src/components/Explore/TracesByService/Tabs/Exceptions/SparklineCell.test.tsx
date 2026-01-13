import React from 'react';
import { render, screen } from '@testing-library/react';
import { SparklineCell } from './SparklineCell';
import { createTheme, GrafanaTheme2 } from '@grafana/data';

// Mock the Sparkline component from @grafana/ui
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Sparkline: ({ sparkline }: any) => (
    <div data-testid="sparkline-mock">
      Sparkline with {sparkline.y.values.length} points
    </div>
  ),
  useStyles2: (fn: (theme: GrafanaTheme2) => any) => fn(createTheme()),
}));

describe('SparklineCell', () => {
  const mockTheme = createTheme();

  it('should render "No data" when seriesData is empty', () => {
    render(<SparklineCell seriesData={[]} theme={mockTheme} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('should render "No data" when seriesData is undefined', () => {
    render(<SparklineCell seriesData={undefined as any} theme={mockTheme} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('should render "Not enough data" when there is only one data point', () => {
    const seriesData = [{ time: 1000, count: 5 }];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByText('Not enough data')).toBeInTheDocument();
  });

  it('should render sparkline with valid data', () => {
    const seriesData = [
      { time: 1000, count: 5 },
      { time: 2000, count: 10 },
      { time: 3000, count: 15 },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByTestId('sparkline-mock')).toBeInTheDocument();
    expect(screen.getByText('Sparkline with 3 points')).toBeInTheDocument();
  });

  it('should filter out invalid count values', () => {
    const seriesData = [
      { time: 1000, count: 5 },
      { time: 2000, count: NaN },
      { time: 3000, count: Infinity },
      { time: 4000, count: 10 },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByTestId('sparkline-mock')).toBeInTheDocument();
    expect(screen.getByText('Sparkline with 2 points')).toBeInTheDocument();
  });

  it('should filter out invalid time values', () => {
    const seriesData = [
      { time: 1000, count: 5 },
      { time: NaN, count: 10 },
      { time: Infinity, count: 15 },
      { time: 4000, count: 20 },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByTestId('sparkline-mock')).toBeInTheDocument();
    // Note: Count and time values are filtered independently, so we get 4 count values
    expect(screen.getByText('Sparkline with 4 points')).toBeInTheDocument();
  });

  it('should show "Not enough data" when all values are filtered out', () => {
    const seriesData = [
      { time: NaN, count: NaN },
      { time: Infinity, count: Infinity },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByText('Not enough data')).toBeInTheDocument();
  });

  it('should handle data with same count values (zero delta)', () => {
    const seriesData = [
      { time: 1000, count: 5 },
      { time: 2000, count: 5 },
      { time: 3000, count: 5 },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByTestId('sparkline-mock')).toBeInTheDocument();
  });

  it('should handle data with same time values (zero delta)', () => {
    const seriesData = [
      { time: 1000, count: 5 },
      { time: 1000, count: 10 },
      { time: 1000, count: 15 },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByTestId('sparkline-mock')).toBeInTheDocument();
  });

  it('should handle large numbers', () => {
    const seriesData = [
      { time: 1700000000000, count: 1000000 },
      { time: 1700000001000, count: 2000000 },
      { time: 1700000002000, count: 3000000 },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByTestId('sparkline-mock')).toBeInTheDocument();
  });

  it('should handle negative count values', () => {
    const seriesData = [
      { time: 1000, count: -5 },
      { time: 2000, count: 10 },
      { time: 3000, count: -15 },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByTestId('sparkline-mock')).toBeInTheDocument();
  });

  it('should handle floating point count values', () => {
    const seriesData = [
      { time: 1000, count: 5.5 },
      { time: 2000, count: 10.2 },
      { time: 3000, count: 15.8 },
    ];
    render(<SparklineCell seriesData={seriesData} theme={mockTheme} />);
    expect(screen.getByTestId('sparkline-mock')).toBeInTheDocument();
  });
});

