import React from 'react';
import { render } from '@testing-library/react';
import { TimeSeekerDragOverlay } from './TimeSeekerDragOverlay';
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
    resizeHandle: 'resize-handle-class',
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

describe('TimeSeekerDragOverlay', () => {
  it('renders without crashing', () => {
    // The drag overlay depends on uplotRef being set, which requires UPlot to be ready
    // Since UPlot is mocked, dragStyles will be empty and it will return null
    const { container } = renderWithProvider(<TimeSeekerDragOverlay />);

    // When dragStyles is empty (no uplot ref), it returns null
    expect(container.firstChild).toBeNull();
  });

  it('does not render when dragStyles.dragOverlayStyle is not set', () => {
    const { container } = renderWithProvider(<TimeSeekerDragOverlay />);
    expect(container.firstChild).toBeNull();
  });
});
