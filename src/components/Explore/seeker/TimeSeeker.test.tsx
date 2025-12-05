import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeeker } from './TimeSeeker';
import { dateTime, FieldType, LoadingState } from '@grafana/data';

// Mock Grafana UI components
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  UPlotChart: () => <div data-testid="uplot-chart">UPlot Chart</div>,
  UPlotConfigBuilder: jest.fn().mockImplementation(() => ({
    setCursor: jest.fn().mockReturnThis(),
    addAxis: jest.fn().mockReturnThis(),
    addSeries: jest.fn().mockReturnThis(),
    addHook: jest.fn().mockReturnThis(),
    getConfig: jest.fn(() => ({ series: [null, {}], scales: {} })),
  })),
  useTheme2: () => ({
    colors: {
      background: { primary: '#fff' },
      border: { weak: '#ccc' },
      text: { secondary: '#666' },
      primary: { shade: '#007bff' },
    },
    spacing: (n: number) => `${n * 8}px`,
    visualization: {
      getColorByName: (name: string) => name,
    },
  }),
  useStyles2: (fn: Function) => fn({
    colors: { background: { primary: '#fff' }, border: { weak: '#ccc' }, primary: { shade: '#007bff' } },
    spacing: (n: number) => `${n * 8}px`,
  }),
  IconButton: ({ onClick, tooltip, name }: any) => (
    <button onClick={onClick} aria-label={tooltip} data-icon={name}>
      {name}
    </button>
  ),
  Popover: ({ content, show }: any) => (show ? <div data-testid="popover">{content}</div> : null),
  AxisPlacement: { Bottom: 'bottom', Left: 'left' },
  DrawStyle: { Line: 'line', Bars: 'bars' },
}));

// Mock ContextWindowSelector
jest.mock('./ContextWindowSelector', () => ({
  ContextWindowSelector: () => <div data-testid="context-selector">Context Selector</div>,
}));

// Mock PanelDataErrorView
jest.mock('@grafana/runtime', () => ({
  PanelDataErrorView: () => <div data-testid="error-view">Error View</div>,
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
    expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
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
    expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();

    rerender(<TimeSeeker {...defaultProps} metric="errors" />);
    expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();

    rerender(<TimeSeeker {...defaultProps} metric="duration" />);
    expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
  });
});

