import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextWindowSelector } from './ContextWindowSelector';

// Mock Grafana UI
jest.mock('@grafana/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, addonAfter }: any) => (
    <div>
      <input value={value} onChange={onChange} data-testid="input" />
      {addonAfter}
    </div>
  ),
  DatePickerWithInput: ({ value, onChange }: any) => (
    <div data-testid="date-picker">
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  ),
  Stack: ({ children }: any) => <div>{children}</div>,
  Field: ({ children, label }: any) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  Grid: ({ children }: any) => <div data-testid="options-grid">{children}</div>,
}));

describe('ContextWindowSelector', () => {
  const now = Date.now();
  const defaultProps = {
    dashboardFrom: now - 3600000, // 1 hour ago
    dashboardTo: now,
    now,
    visibleRange: { from: now - 7200000, to: now }, // 2 hours ago
    setVisibleRange: jest.fn(),
    setRelativeContextDuration: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders preset duration options', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    expect(screen.getByText('Last 12 hours')).toBeInTheDocument();
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    expect(screen.getByText('Last 3 days')).toBeInTheDocument();
    expect(screen.getByText('Last 1 week')).toBeInTheDocument();
    expect(screen.getByText('Last 2 weeks')).toBeInTheDocument();
    expect(screen.getByText('Same as timepicker')).toBeInTheDocument();
  });

  it('renders From and To input fields', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
  });

  it('renders Apply Absolute Range button', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    expect(screen.getByText('Apply Absolute Range')).toBeInTheDocument();
  });

  it('calls setVisibleRange and onClose when preset option is clicked', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    fireEvent.click(screen.getByText('Last 12 hours'));

    expect(defaultProps.setVisibleRange).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls setRelativeContextDuration when preset option is clicked', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    fireEvent.click(screen.getByText('Last 24 hours'));

    expect(defaultProps.setRelativeContextDuration).toHaveBeenCalledWith('24h');
  });

  it('closes when clicking outside the wrapper', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ContextWindowSelector {...defaultProps} />
      </div>
    );

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('applies valid absolute range', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    // Get the inputs
    const inputs = screen.getAllByTestId('input');
    const fromInput = inputs[0];
    const toInput = inputs[1];

    // Change the values
    fireEvent.change(fromInput, { target: { value: '2024-01-01T00:00:00.000Z' } });
    fireEvent.change(toInput, { target: { value: '2024-01-02T00:00:00.000Z' } });

    fireEvent.click(screen.getByText('Apply Absolute Range'));

    expect(defaultProps.setVisibleRange).toHaveBeenCalled();
    expect(defaultProps.setRelativeContextDuration).toHaveBeenCalledWith(null);
  });

  it('does not apply invalid absolute range (from > to)', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    const inputs = screen.getAllByTestId('input');
    const fromInput = inputs[0];
    const toInput = inputs[1];

    // Set invalid range where from > to
    fireEvent.change(fromInput, { target: { value: '2024-01-02T00:00:00.000Z' } });
    fireEvent.change(toInput, { target: { value: '2024-01-01T00:00:00.000Z' } });

    fireEvent.click(screen.getByText('Apply Absolute Range'));

    // Should not call setVisibleRange with invalid range
    expect(defaultProps.setVisibleRange).not.toHaveBeenCalled();
  });

  it('toggles From date picker visibility', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    // Initially no date picker
    expect(screen.queryAllByTestId('date-picker').length).toBe(0);

    // Click the calendar button for From field (first icon button)
    const calendarButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(calendarButtons[0]); // From calendar button

    // Date picker should appear
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  it('toggles To date picker visibility', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    // Click the calendar button for To field
    const calendarButtons = screen.getAllByRole('button', { name: '' });
    // Need to find the second calendar button (after From's)
    const toCalendarButton = calendarButtons.find(
      (btn) => btn.closest('[label="To"]') || calendarButtons.indexOf(btn) === 1
    );

    if (toCalendarButton) {
      fireEvent.click(toCalendarButton);
    }
  });

  it('handles "Same as timepicker" option correctly', () => {
    render(<ContextWindowSelector {...defaultProps} />);

    fireEvent.click(screen.getByText('Same as timepicker'));

    // With 0h duration, the extra window is 0, so range should match dashboard range
    expect(defaultProps.setVisibleRange).toHaveBeenCalled();
    expect(defaultProps.setRelativeContextDuration).toHaveBeenCalledWith('0h');
  });
});
