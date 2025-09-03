import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupBySelectorV2, createGroupBySelectorAdapter, createDefaultGroupBySelectorConfig } from './';
import { AttributesBreakdownScene } from '../TracesByService/Tabs/Breakdown/AttributesBreakdownScene';
import { AttributesComparisonScene } from '../TracesByService/Tabs/Comparison/AttributesComparisonScene';

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
  Select: ({ placeholder, options, onChange, value }: any) => (
    <select
      data-testid="select-dropdown"
      value={value || ''}
      onChange={(e) => onChange?.({ value: e.target.value })}
    >
      <option value="">{placeholder}</option>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  RadioButtonGroup: ({ options, value, onChange }: any) => (
    <div data-testid="radio-group">
      {options?.map((option: any) => (
        <label key={option.value}>
          <input
            type="radio"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  ),
}));

jest.mock('@react-aria/utils', () => ({
  useResizeObserver: jest.fn(),
}));

// Mock utility functions
jest.mock('../../../utils/utils', () => ({
  getTraceExplorationScene: jest.fn(() => ({
    useState: () => ({ initialGroupBy: 'service.name' }),
  })),
  getFiltersVariable: jest.fn(() => ({
    useState: () => ({
      filters: [
        { key: 'status', operator: '=', value: 'error' },
        { key: 'service.name', operator: '=', value: 'api' },
      ],
    }),
  })),
  getMetricVariable: jest.fn(() => ({
    useState: () => ({ value: 'rate' }),
  })),
}));

describe('GroupBySelectorV2 Integration Tests', () => {
  const defaultOptions = [
    { label: 'Service Name', value: 'resource.service.name' },
    { label: 'Operation Name', value: 'name' },
    { label: 'Status', value: 'status' },
    { label: 'HTTP Status Code', value: 'span.http.status_code' },
  ];

  const radioAttributes = ['resource.service.name', 'name', 'status'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Direct Integration', () => {
    it('renders with traces domain configuration', () => {
      const mockOnChange = jest.fn();
      const tracesConfig = createDefaultGroupBySelectorConfig('traces');

      render(
        <GroupBySelectorV2
          options={defaultOptions}
          radioAttributes={radioAttributes}
          value="resource.service.name"
          onChange={mockOnChange}
          filters={[
            { key: 'status', operator: '=', value: 'error' },
          ]}
          currentMetric="rate"
          {...tracesConfig}
        />
      );

      expect(screen.getByText('Group by')).toBeInTheDocument();
      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
      expect(screen.getByTestId('select-dropdown')).toBeInTheDocument();
    });

    it('applies filtering rules correctly', () => {
      const mockOnChange = jest.fn();

      render(
        <GroupBySelectorV2
          options={defaultOptions}
          radioAttributes={radioAttributes}
          value="status"
          onChange={mockOnChange}
          filters={[
            { key: 'status', operator: '=', value: 'error' },
          ]}
          currentMetric="rate"
          filteringRules={{
            excludeFilteredFromRadio: true,
            excludeAttributesForMetrics: {
              'rate': ['status'],
            },
          }}
        />
      );

      // Status should be excluded from radio buttons due to filtering rules
      const radioInputs = screen.getAllByRole('radio');
      const statusRadio = radioInputs.find(input =>
        input.getAttribute('value') === 'status'
      );
      expect(statusRadio).toBeUndefined();
    });

    it('handles attribute prefixes correctly', () => {
      const mockOnChange = jest.fn();

      render(
        <GroupBySelectorV2
          options={[
            { label: 'resource.service.name', value: 'resource.service.name' },
            { label: 'span.http.method', value: 'span.http.method' },
          ]}
          radioAttributes={['resource.service.name', 'span.http.method']}
          value=""
          onChange={mockOnChange}
          attributePrefixes={{
            resource: 'resource.',
            span: 'span.',
          }}
        />
      );

      // Labels should have prefixes removed
      expect(screen.getByText('service.name')).toBeInTheDocument();
      expect(screen.getByText('http.method')).toBeInTheDocument();
    });
  });

  describe('Adapter Integration', () => {
    const createMockModel = (type: 'breakdown' | 'comparison') => {
      const mockModel = {
        onChange: jest.fn(),
        useState: jest.fn(() => ({})),
      };

      // Mock the scene type
      if (type === 'breakdown') {
        Object.setPrototypeOf(mockModel, AttributesBreakdownScene.prototype);
      } else {
        Object.setPrototypeOf(mockModel, AttributesComparisonScene.prototype);
      }

      return mockModel as any;
    };

    it('creates adapter configuration for breakdown scene', () => {
      const mockModel = createMockModel('breakdown');
      const adapterConfig = createGroupBySelectorAdapter(mockModel);

      expect(adapterConfig).toHaveProperty('filters');
      expect(adapterConfig).toHaveProperty('currentMetric');
      expect(adapterConfig).toHaveProperty('initialGroupBy');
      expect(adapterConfig).toHaveProperty('attributePrefixes');
      expect(adapterConfig).toHaveProperty('filteringRules');
    });

    it('creates adapter configuration for comparison scene', () => {
      const mockModel = createMockModel('comparison');
      const adapterConfig = createGroupBySelectorAdapter(mockModel);

      expect(adapterConfig).toHaveProperty('filters');
      expect(adapterConfig).toHaveProperty('currentMetric');
      expect(adapterConfig.attributePrefixes).toEqual({
        span: 'span.',
        resource: 'resource.',
        event: 'event.',
      });
    });

    it('handles adapter errors gracefully', () => {
      const mockModel = {} as any; // Invalid model
      const adapterConfig = createGroupBySelectorAdapter(mockModel);

      // Should return safe defaults
      expect(adapterConfig.filters).toEqual([]);
      expect(adapterConfig).toHaveProperty('attributePrefixes');
    });
  });

  describe('Domain Configurations', () => {
    it('applies logs domain configuration', () => {
      const logsConfig = createDefaultGroupBySelectorConfig('logs');

      expect(logsConfig.attributePrefixes).toEqual({
        log: 'log.',
        resource: 'resource.',
      });
      expect(logsConfig.ignoredAttributes).toContain('timestamp');
    });

    it('applies metrics domain configuration', () => {
      const metricsConfig = createDefaultGroupBySelectorConfig('metrics');

      expect(metricsConfig.attributePrefixes).toEqual({
        metric: 'metric.',
        resource: 'resource.',
      });
      expect(metricsConfig.ignoredAttributes).toContain('__name__');
    });

    it('applies custom domain configuration', () => {
      const customConfig = createDefaultGroupBySelectorConfig('custom');

      expect(customConfig.attributePrefixes).toEqual({});
      expect(customConfig.ignoredAttributes).toEqual([]);
    });
  });

  describe('User Interactions', () => {
    it('handles radio button selection', () => {
      const mockOnChange = jest.fn();

      render(
        <GroupBySelectorV2
          options={defaultOptions}
          radioAttributes={radioAttributes}
          value=""
          onChange={mockOnChange}
        />
      );

      const serviceNameRadio = screen.getByDisplayValue('resource.service.name');
      fireEvent.click(serviceNameRadio);

      expect(mockOnChange).toHaveBeenCalledWith('resource.service.name');
    });

    it('handles select dropdown selection', () => {
      const mockOnChange = jest.fn();

      render(
        <GroupBySelectorV2
          options={defaultOptions}
          radioAttributes={['resource.service.name']} // Only one radio option
          value=""
          onChange={mockOnChange}
        />
      );

      const selectDropdown = screen.getByTestId('select-dropdown');
      fireEvent.change(selectDropdown, { target: { value: 'span.http.status_code' } });

      expect(mockOnChange).toHaveBeenCalledWith('span.http.status_code');
    });

    it('shows "All" option when showAll is true', () => {
      render(
        <GroupBySelectorV2
          options={defaultOptions}
          radioAttributes={radioAttributes}
          value=""
          onChange={jest.fn()}
          showAll={true}
        />
      );

      expect(screen.getByText('All')).toBeInTheDocument();
    });
  });

  describe('Performance and Responsiveness', () => {
    it('handles large option lists efficiently', () => {
      const largeOptions = Array.from({ length: 1000 }, (_, i) => ({
        label: `Option ${i}`,
        value: `option_${i}`,
      }));

      const mockOnChange = jest.fn();

      render(
        <GroupBySelectorV2
          options={largeOptions}
          radioAttributes={['option_0', 'option_1']}
          value=""
          onChange={mockOnChange}
          searchConfig={{ maxOptions: 100 }}
        />
      );

      // Should render without performance issues
      expect(screen.getByTestId('select-dropdown')).toBeInTheDocument();
    });

    it('applies responsive radio button configuration', () => {
      const mockOnChange = jest.fn();

      render(
        <GroupBySelectorV2
          options={defaultOptions}
          radioAttributes={radioAttributes}
          value=""
          onChange={mockOnChange}
          layoutConfig={{
            enableResponsiveRadioButtons: true,
            additionalWidthPerItem: 50,
          }}
        />
      );

      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
    });
  });
});
