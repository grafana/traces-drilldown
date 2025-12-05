import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { TimeSeekerProvider, useTimeSeeker, getMetricColor } from './TimeSeekerContext';
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
    colors: {
      background: { primary: '#fff' },
      border: { weak: '#ccc' },
      primary: { shade: '#007bff' },
    },
    visualization: {
      getColorByName: (name: string) => name,
    },
  }),
  AxisPlacement: { Bottom: 'bottom', Left: 'left' },
  DrawStyle: { Line: 'line', Bars: 'bars' },
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

// Test component to consume context
const TestConsumer = () => {
  const context = useTimeSeeker();
  return (
    <div>
      <span data-testid="visible-from">{context.visibleRange.from}</span>
      <span data-testid="visible-to">{context.visibleRange.to}</span>
      <span data-testid="dashboard-from">{context.dashboardFrom}</span>
      <span data-testid="dashboard-to">{context.dashboardTo}</span>
      <span data-testid="width">{context.width}</span>
      <span data-testid="chart-height">{context.chartHeight}</span>
      <button data-testid="zoom-in" onClick={() => context.zoomContextWindow(0.5)}>
        Zoom In
      </button>
      <button data-testid="pan-left" onClick={() => context.panContextWindow('left')}>
        Pan Left
      </button>
    </div>
  );
};

describe('TimeSeekerContext', () => {
  const defaultProps = {
    data: createMockData(),
    width: 800,
    chartHeight: 42,
    onChangeTimeRange: jest.fn(),
  };

  describe('TimeSeekerProvider', () => {
    it('provides context values to children', () => {
      render(
        <TimeSeekerProvider {...defaultProps}>
          <TestConsumer />
        </TimeSeekerProvider>
      );

      expect(screen.getByTestId('dashboard-from')).toHaveTextContent('1000');
      expect(screen.getByTestId('dashboard-to')).toHaveTextContent('3000');
      expect(screen.getByTestId('width')).toHaveTextContent('800');
      expect(screen.getByTestId('chart-height')).toHaveTextContent('42');
    });

    it('uses initialVisibleRange when provided', () => {
      render(
        <TimeSeekerProvider {...defaultProps} initialVisibleRange={{ from: 500, to: 5000 }}>
          <TestConsumer />
        </TimeSeekerProvider>
      );

      expect(screen.getByTestId('visible-from')).toHaveTextContent('500');
      expect(screen.getByTestId('visible-to')).toHaveTextContent('5000');
    });

    it('passes loading ranges to context', () => {
      const loadingRanges = [{ from: 1000, to: 2000 }];

      const TestLoadingConsumer = () => {
        const { loadingRanges } = useTimeSeeker();
        return <span data-testid="loading">{loadingRanges?.length ?? 0}</span>;
      };

      render(
        <TimeSeekerProvider {...defaultProps} loadingRanges={loadingRanges}>
          <TestLoadingConsumer />
        </TimeSeekerProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('1');
    });
  });

  describe('useTimeSeeker hook', () => {
    it('throws error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestConsumer />)).toThrow('useTimeSeeker must be used within a TimeSeekerProvider');

      consoleError.mockRestore();
    });
  });

  describe('getMetricColor', () => {
    const mockTheme = {
      visualization: {
        getColorByName: (name: string) => `color-${name}`,
      },
    } as any;

    it('returns blue for duration metric', () => {
      expect(getMetricColor(mockTheme, 'duration')).toBe('color-blue');
    });

    it('returns semi-dark-red for errors metric', () => {
      expect(getMetricColor(mockTheme, 'errors')).toBe('color-semi-dark-red');
    });

    it('returns green for rate metric', () => {
      expect(getMetricColor(mockTheme, 'rate')).toBe('color-green');
    });

    it('returns green for undefined metric', () => {
      expect(getMetricColor(mockTheme, undefined)).toBe('color-green');
    });
  });

  describe('Context actions', () => {
    it('zoomContextWindow updates visible range', () => {
      const onVisibleRangeChange = jest.fn();

      render(
        <TimeSeekerProvider
          {...defaultProps}
          initialVisibleRange={{ from: 0, to: 1000 }}
          onVisibleRangeChange={onVisibleRangeChange}
        >
          <TestConsumer />
        </TimeSeekerProvider>
      );

      act(() => {
        screen.getByTestId('zoom-in').click();
      });

      expect(onVisibleRangeChange).toHaveBeenCalled();
    });

    it('panContextWindow shifts visible range', () => {
      const onVisibleRangeChange = jest.fn();

      render(
        <TimeSeekerProvider
          {...defaultProps}
          initialVisibleRange={{ from: 0, to: 1000 }}
          onVisibleRangeChange={onVisibleRangeChange}
        >
          <TestConsumer />
        </TimeSeekerProvider>
      );

      act(() => {
        screen.getByTestId('pan-left').click();
      });

      expect(onVisibleRangeChange).toHaveBeenCalled();
    });
  });
});

