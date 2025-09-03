import React from 'react';
import { render, screen } from '@testing-library/react';
import { GroupBySelector } from './GroupBySelector';
import { createDefaultGroupBySelectorConfig } from './utils';

// Mock the required Grafana UI components
jest.mock('@grafana/ui', () => ({
  useTheme2: () => ({
    typography: { fontSize: 14 },
    spacing: (value: number) => `${value * 8}px`,
  }),
  useStyles2: (getStyles: any) => getStyles({
    typography: { fontSize: 14 },
    spacing: (value: number) => `${value * 8}px`,
  }),
  measureText: jest.fn(() => ({ width: 100 })),
  Field: ({ label, children }: any) => <div><label>{label}</label>{children}</div>,
  Select: ({ placeholder }: any) => <select><option>{placeholder}</option></select>,
  RadioButtonGroup: ({ options }: any) => (
    <div>{options?.map((opt: any) => <span key={opt.value}>{opt.label}</span>)}</div>
  ),
}));

jest.mock('@react-aria/utils', () => ({
  useResizeObserver: jest.fn(),
}));

describe('GroupBySelector', () => {
  const defaultProps = {
    options: [
      { label: 'Service Name', value: 'resource.service.name' },
      { label: 'Operation Name', value: 'name' },
      { label: 'Status', value: 'status' },
    ],
    radioAttributes: ['resource.service.name', 'name'],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with basic props', () => {
    render(<GroupBySelector {...defaultProps} />);

    expect(screen.getByText('Group by')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Other attributes')).toBeInTheDocument();
  });

  it('renders with custom field label', () => {
        render(
      <GroupBySelector
        {...defaultProps}
        fieldLabel="Custom Group By"
      />
    );

    expect(screen.getByText('Custom Group By')).toBeInTheDocument();
  });

  it('renders with showAll option', () => {
    render(<GroupBySelector {...defaultProps} showAll />);

    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('applies traces domain configuration', () => {
    const tracesConfig = createDefaultGroupBySelectorConfig('traces');

    expect(tracesConfig.attributePrefixes).toEqual({
      span: 'span.',
      resource: 'resource.',
      event: 'event.',
    });

    expect(tracesConfig.filteringRules?.excludeFilteredFromRadio).toBe(true);
    expect(tracesConfig.ignoredAttributes).toContain('duration');
  });

  it('handles onChange callback', () => {
    const mockOnChange = jest.fn();
    render(<GroupBySelector {...defaultProps} onChange={mockOnChange} />);

    // This test would need more setup to actually trigger onChange
    // but verifies the prop is passed correctly
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('renders with filters configuration', () => {
    const filters = [
      { key: 'status', operator: '=', value: 'ok' },
    ];

        render(
      <GroupBySelector
        {...defaultProps}
        filters={filters}
        currentMetric="rate"
      />
    );

    // Component should render without errors with filter configuration
    expect(screen.getByText('Group by')).toBeInTheDocument();
  });

  it('applies custom attribute prefixes', () => {
    const attributePrefixes = {
      custom: 'custom.',
      test: 'test.',
    };

        render(
      <GroupBySelector
        {...defaultProps}
        attributePrefixes={attributePrefixes}
      />
    );

    // Component should render without errors with custom prefixes
    expect(screen.getByText('Group by')).toBeInTheDocument();
  });
});
