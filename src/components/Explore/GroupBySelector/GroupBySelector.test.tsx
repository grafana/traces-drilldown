import React from 'react';
import { render, screen } from '@testing-library/react';
import { GroupBySelector } from './GroupBySelector';
import { createDefaultGroupBySelectorConfig } from './utils';

jest.mock('@react-aria/utils', () => ({
  useResizeObserver: jest.fn(({ onResize }) => {
    // Simulate a resize event with sufficient width
    setTimeout(() => {
      onResize();
    }, 0);
  }),
  getOwnerDocument: jest.fn(() => document),
  getOwnerWindow: jest.fn(() => window),
}));

// Mock measureText before importing @grafana/ui
jest.mock('@grafana/ui', () => ({
  Combobox: jest.fn(({ children, isClearable, options, onChange, value, placeholder, ...props }) =>
    React.createElement('div', {
      'data-testid': 'combobox',
      placeholder,
      ...props
    }, children)
  ),
  RadioButtonGroup: jest.fn(({ options, value, onChange }) =>
    React.createElement('div', { 'data-testid': 'radio-group' },
      options.map((option: any, index: number) =>
        React.createElement('div', {
          key: index,
        }, [
          React.createElement('input', {
            key: `input-${index}`,
            type: 'radio',
            value: option.value,
            checked: value === option.value,
            onChange: () => onChange(option.value),
            'aria-label': option.label
          }),
          React.createElement('span', {
            key: `label-${index}`,
          }, option.label)
        ])
      )
    )
  ),
  Field: jest.fn(({ label, children }) =>
    React.createElement('div', { 'data-testid': 'field' },
      React.createElement('label', null, label),
      children
    )
  ),
  useStyles2: jest.fn(() => ({
    container: 'container-class',
    select: 'select-class'
  })),
  useTheme2: jest.fn(() => ({
    typography: { fontSize: 14 },
    spacing: (multiplier: number) => `${multiplier * 8}px`
  })),
  measureText: jest.fn(() => ({ width: 100, height: 20 })),
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
    layoutConfig: { enableResponsiveRadioButtons: false },
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

    // Component auto-calls onChange with the first radio option on mount
    expect(mockOnChange).toHaveBeenCalledWith('resource.service.name', true);
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
