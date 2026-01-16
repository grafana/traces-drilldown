import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExceptionsTable, ExceptionRow } from './ExceptionsTable';
import { createTheme } from '@grafana/data';

// Mock the @grafana/ui components
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Icon: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
  Tooltip: ({ children, content }: any) => (
    <div data-tooltip={content}>
      {children}
      <span className="tooltip-content">{content}</span>
    </div>
  ),
  useStyles2: (fn: any) => fn(createTheme()),
}));

jest.mock('./SparklineCell', () => ({
  SparklineCell: ({ seriesData }: any) => (
    <div data-testid="sparkline-cell">Sparkline ({seriesData.length} points)</div>
  ),
}));

describe('ExceptionsTable', () => {
  const mockTheme = createTheme();
  const mockOnFilterClick = jest.fn();
  const mockScene = {} as any;

  const mockRows: ExceptionRow[] = [
    {
      type: 'SQLException',
      message: 'Database connection failed',
      service: 'user-service',
      lastSeen: '5m ago',
      occurrences: 42,
      timeSeries: [
        { time: 1000, count: 10 },
        { time: 2000, count: 32 },
      ],
    },
    {
      type: 'NullPointerException',
      message: 'Object reference not set to an instance of an object',
      service: 'payment-service',
      lastSeen: '1h ago',
      occurrences: 15,
      timeSeries: [
        { time: 1000, count: 5 },
        { time: 2000, count: 10 },
      ],
    },
  ];

  beforeEach(() => {
    mockOnFilterClick.mockClear();
  });

  it('should render table with exception rows', () => {
    render(<ExceptionsTable rows={mockRows} theme={mockTheme} scene={mockScene} />);

    // Check headers
    expect(screen.getByText('Exception Details')).toBeInTheDocument();
    expect(screen.getByText('Occurrences')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();

    // Check exception types
    expect(screen.getByText('SQLException')).toBeInTheDocument();
    expect(screen.getByText('NullPointerException')).toBeInTheDocument();

    // Check messages
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText('Object reference not set to an instance of an object')).toBeInTheDocument();

    // Check services
    expect(screen.getByText('user-service')).toBeInTheDocument();
    expect(screen.getByText('payment-service')).toBeInTheDocument();

    // Check last seen
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    expect(screen.getByText('1h ago')).toBeInTheDocument();

    // Check occurrences
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('should render sparkline cells for each row', () => {
    render(<ExceptionsTable rows={mockRows} theme={mockTheme} scene={mockScene} />);

    const sparklines = screen.getAllByTestId('sparkline-cell');
    expect(sparklines).toHaveLength(2);
  });

  it('should call onFilterClick when exception type is clicked', () => {
    render(<ExceptionsTable rows={mockRows} theme={mockTheme} scene={mockScene} onFilterClick={mockOnFilterClick} />);

    const typeElement = screen.getByText('SQLException');
    fireEvent.click(typeElement);

    expect(mockOnFilterClick).toHaveBeenCalledWith('event.exception.type', 'SQLException');
  });

  it('should call onFilterClick when exception message is clicked', () => {
    render(<ExceptionsTable rows={mockRows} theme={mockTheme} scene={mockScene} onFilterClick={mockOnFilterClick} />);

    const messageElement = screen.getByText('Database connection failed');
    fireEvent.click(messageElement);

    expect(mockOnFilterClick).toHaveBeenCalledWith('event.exception.message', 'Database connection failed');
  });

  it('should not call onFilterClick when onFilterClick prop is not provided', () => {
    render(<ExceptionsTable rows={mockRows} theme={mockTheme} scene={mockScene} />);

    const typeElement = screen.getByText('SQLException');
    fireEvent.click(typeElement);

    expect(mockOnFilterClick).not.toHaveBeenCalled();
  });

  it('should render empty table when rows array is empty', () => {
    render(<ExceptionsTable rows={[]} theme={mockTheme} scene={mockScene} />);

    expect(screen.getByText('Exception Details')).toBeInTheDocument();
    expect(screen.queryByText('SQLException')).not.toBeInTheDocument();
  });

  it('should render service icon when service is present', () => {
    render(<ExceptionsTable rows={mockRows} theme={mockTheme} scene={mockScene} />);

    const cubeIcons = screen.getAllByTestId('icon-cube');
    expect(cubeIcons.length).toBeGreaterThan(0);
  });

  it('should render clock icon when lastSeen is present', () => {
    render(<ExceptionsTable rows={mockRows} theme={mockTheme} scene={mockScene} />);

    const clockIcons = screen.getAllByTestId('icon-clock-nine');
    expect(clockIcons.length).toBeGreaterThan(0);
  });

  it('should handle rows without service', () => {
    const rowsWithoutService: ExceptionRow[] = [
      {
        type: 'Error',
        message: 'Test error',
        service: '',
        lastSeen: '1m ago',
        occurrences: 1,
        timeSeries: [],
      },
    ];

    render(<ExceptionsTable rows={rowsWithoutService} theme={mockTheme} scene={mockScene} />);

    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-cube')).not.toBeInTheDocument();
  });

  it('should handle rows without lastSeen', () => {
    const rowsWithoutLastSeen: ExceptionRow[] = [
      {
        type: 'Error',
        message: 'Test error',
        service: 'test-service',
        lastSeen: '',
        occurrences: 1,
        timeSeries: [],
      },
    ];

    render(<ExceptionsTable rows={rowsWithoutLastSeen} theme={mockTheme} scene={mockScene} />);

    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-clock-nine')).not.toBeInTheDocument();
  });

  it('should render with long exception messages', () => {
    const longMessageRows: ExceptionRow[] = [
      {
        type: 'Error',
        message: 'This is a very long exception message that should be truncated in the UI but still fully accessible via tooltip when the user hovers over it',
        service: 'test-service',
        lastSeen: '1m ago',
        occurrences: 1,
        timeSeries: [],
      },
    ];

    render(<ExceptionsTable rows={longMessageRows} theme={mockTheme} scene={mockScene} />);

    expect(screen.getByText(/This is a very long exception message/)).toBeInTheDocument();
  });

  it('should handle multiple rows correctly', () => {
    const manyRows: ExceptionRow[] = Array.from({ length: 10 }, (_, i) => ({
      type: `Error${i}`,
      message: `Message ${i}`,
      service: `service-${i}`,
      lastSeen: `${i}m ago`,
      occurrences: i + 1,
      timeSeries: [{ time: 1000, count: i }],
    }));

    render(<ExceptionsTable rows={manyRows} theme={mockTheme} scene={mockScene} />);

    expect(screen.getByText('Error0')).toBeInTheDocument();
    expect(screen.getByText('Error9')).toBeInTheDocument();
    expect(screen.getByText('Message 0')).toBeInTheDocument();
    expect(screen.getByText('Message 9')).toBeInTheDocument();
  });
});

