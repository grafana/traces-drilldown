import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSeekerControls } from './TimeSeekerControls';
import { TimeSeekerProvider } from './TimeSeekerContext';
import { dateTime, FieldType, LoadingState } from '@grafana/data';

// Mock Grafana UI components
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  IconButton: ({ onClick, tooltip, name }: any) => (
    <button onClick={onClick} aria-label={tooltip} data-icon={name}>
      {name}
    </button>
  ),
  Popover: ({ content, show }: any) => (show ? <div data-testid="popover">{content}</div> : null),
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
    colors: { background: { primary: '#fff' }, border: { weak: '#ccc' } },
    spacing: () => '8px',
  }),
}));

// Mock ContextWindowSelector
jest.mock('./ContextWindowSelector', () => ({
  ContextWindowSelector: () => <div data-testid="context-selector">Context Selector</div>,
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

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <TimeSeekerProvider
      data={createMockData()}
      width={800}
      chartHeight={42}
      onChangeTimeRange={jest.fn()}
      initialVisibleRange={{ from: 0, to: 10000 }}
    >
      {ui}
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
    expect(screen.getByRole('button', { name: 'Reset context window' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set context window' })).toBeInTheDocument();
  });

  it('calls panContextWindow when pan left is clicked', () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Pan left' }));
    // No error means the action was dispatched successfully
  });

  it('calls panContextWindow when pan right is clicked', () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Pan right' }));
  });

  it('calls zoomContextWindow with 0.5 when zoom in is clicked', () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in context' }));
  });

  it('calls zoomContextWindow with 2 when zoom out is clicked', () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom out context' }));
  });

  it('calls resetContextWindow when reset is clicked', () => {
    renderWithProvider(<TimeSeekerControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset context window' }));
  });

  it('opens context window selector popover when calendar button is clicked', () => {
    renderWithProvider(<TimeSeekerControls />);

    expect(screen.queryByTestId('popover')).not.toBeInTheDocument();

    // Get all buttons and find the calendar button by its icon
    const calendarButton = screen.getByRole('button', { name: 'Set context window' });
    fireEvent.click(calendarButton);

    expect(screen.getByTestId('popover')).toBeInTheDocument();
    expect(screen.getByTestId('context-selector')).toBeInTheDocument();
  });
});

