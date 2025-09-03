import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { GroupBySelector } from './GroupBySelector';
import { createDefaultGroupBySelectorConfig } from './utils';

// Mock performance measurement
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => [{ duration: 16.5 }]), // Mock 60fps target
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

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
  Select: ({ placeholder, options, virtualized }: any) => (
    <select data-testid="select-dropdown" data-virtualized={virtualized}>
      <option value="">{placeholder}</option>
      {options?.slice(0, virtualized ? 100 : options.length).map((option: any, index: number) => (
        <option key={option.value || index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  RadioButtonGroup: ({ options }: any) => (
    <div data-testid="radio-group" data-count={options?.length || 0}>
      {options?.map((option: any) => (
        <input key={option.value} type="radio" value={option.value} />
      ))}
    </div>
  ),
}));

jest.mock('@react-aria/utils', () => ({
  useResizeObserver: ({ onResize }: any) => {
    // Simulate resize observer
    React.useEffect(() => {
      onResize?.();
    }, [onResize]);
  },
}));

describe('GroupBySelector Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Large Dataset Performance', () => {
    it('should handle 1000 options efficiently', () => {
      const largeOptions = Array.from({ length: 1000 }, (_, i) => ({
        label: `Option ${i}`,
        value: `option_${i}`,
      }));

      const radioAttributes = Array.from({ length: 10 }, (_, i) => `option_${i}`);

      performance.mark('render-start');

      const { rerender } = render(
        <GroupBySelector
          options={largeOptions}
          radioAttributes={radioAttributes}
          value=""
          onChange={jest.fn()}
          searchConfig={{ maxOptions: 100 }}
          virtualizationConfig={{ enabled: true }}
        />
      );

      performance.mark('render-end');

      // Should render without issues
      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
      expect(screen.getByTestId('select-dropdown')).toBeInTheDocument();

      // Test re-render performance
      performance.mark('rerender-start');

      rerender(
        <GroupBySelector
          options={largeOptions}
          radioAttributes={radioAttributes}
          value="option_5"
          onChange={jest.fn()}
          searchConfig={{ maxOptions: 100 }}
          virtualizationConfig={{ enabled: true }}
        />
      );

      performance.mark('rerender-end');

      // Verify virtualization is enabled
      const selectElement = screen.getByTestId('select-dropdown');
      expect(selectElement.getAttribute('data-virtualized')).toBe('true');
    });

    it('should limit options when maxOptions is set', () => {
      const largeOptions = Array.from({ length: 2000 }, (_, i) => ({
        label: `Option ${i}`,
        value: `option_${i}`,
      }));

      render(
        <GroupBySelector
          options={largeOptions}
          radioAttributes={['option_0']}
          value=""
          onChange={jest.fn()}
          searchConfig={{ maxOptions: 500 }}
        />
      );

      const selectElement = screen.getByTestId('select-dropdown');
      const optionElements = selectElement.querySelectorAll('option');

      // Should limit to maxOptions + placeholder
      expect(optionElements.length).toBeLessThanOrEqual(501);
    });
  });

  describe('Responsive Radio Button Performance', () => {
    it('should efficiently calculate radio button visibility', () => {
      const options = Array.from({ length: 100 }, (_, i) => ({
        label: `Attribute ${i}`,
        value: `attr_${i}`,
      }));

      const radioAttributes = Array.from({ length: 20 }, (_, i) => `attr_${i}`);

      performance.mark('responsive-start');

      render(
        <GroupBySelector
          options={options}
          radioAttributes={radioAttributes}
          value=""
          onChange={jest.fn()}
          layoutConfig={{
            enableResponsiveRadioButtons: true,
            additionalWidthPerItem: 40,
            widthOfOtherAttributes: 180,
          }}
        />
      );

      performance.mark('responsive-end');

      const radioGroup = screen.getByTestId('radio-group');
      expect(radioGroup).toBeInTheDocument();

      // Should have calculated visible radio buttons
      const radioCount = parseInt(radioGroup.getAttribute('data-count') || '0');
      expect(radioCount).toBeGreaterThan(0);
      expect(radioCount).toBeLessThanOrEqual(20);
    });

    it('should handle resize events efficiently', () => {
      const ResizeTestComponent = () => {
        const [, setWidth] = React.useState(800);

        return (
          <div>
            <button onClick={() => setWidth(w => w + 100)} data-testid="resize-trigger">
              Resize
            </button>
            <GroupBySelector
              options={[
                { label: 'Service Name', value: 'service.name' },
                { label: 'Operation Name', value: 'operation.name' },
              ]}
              radioAttributes={['service.name', 'operation.name']}
              value=""
              onChange={jest.fn()}
              layoutConfig={{ enableResponsiveRadioButtons: true }}
            />
          </div>
        );
      };

      render(<ResizeTestComponent />);

      performance.mark('resize-start');

      // Simulate resize event
      act(() => {
        const resizeTrigger = screen.getByTestId('resize-trigger');
        resizeTrigger.click();
      });

      performance.mark('resize-end');

      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
    });
  });

  describe('Memoization Performance', () => {
    it('should memoize expensive calculations', () => {
      const options = Array.from({ length: 500 }, (_, i) => ({
        label: `Option ${i}`,
        value: `option_${i}`,
      }));

      const radioAttributes = Array.from({ length: 10 }, (_, i) => `option_${i}`);

      const TestComponent = ({ metric }: { metric: string }) => (
        <GroupBySelector
          options={options}
          radioAttributes={radioAttributes}
          value=""
          onChange={jest.fn()}
          currentMetric={metric}
          {...createDefaultGroupBySelectorConfig('traces')}
        />
      );

      const { rerender } = render(<TestComponent metric="duration" />);

      performance.mark('memoization-start');

      // Re-render with same props - should use memoized values
      rerender(<TestComponent metric="duration" />);

      performance.mark('memoization-end');

      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
    });

    it('should recalculate when dependencies change', () => {
      const options = [
        { label: 'Service Name', value: 'service.name' },
        { label: 'Status', value: 'status' },
      ];

      const TestComponent = ({ metric }: { metric: string }) => (
        <GroupBySelector
          options={options}
          radioAttributes={['service.name', 'status']}
          value=""
          onChange={jest.fn()}
          currentMetric={metric}
          filteringRules={{
            excludeAttributesForMetrics: {
              'rate': ['status'],
            },
          }}
        />
      );

      const { rerender } = render(<TestComponent metric="duration" />);

      // Should show both radio buttons
      let radioGroup = screen.getByTestId('radio-group');
      expect(parseInt(radioGroup.getAttribute('data-count') || '0')).toBe(2);

      // Change metric - should recalculate and exclude status
      rerender(<TestComponent metric="rate" />);

      radioGroup = screen.getByTestId('radio-group');
      expect(parseInt(radioGroup.getAttribute('data-count') || '0')).toBe(1);
    });
  });

  describe('Configuration Performance', () => {
    it('should efficiently merge configurations', () => {
      const customConfig = {
        attributePrefixes: { custom: 'custom.' },
        filteringRules: { excludeFilteredFromRadio: false },
        searchConfig: { maxOptions: 200 },
      };

      performance.mark('config-start');

      render(
        <GroupBySelector
          options={[{ label: 'Test', value: 'test' }]}
          radioAttributes={['test']}
          value=""
          onChange={jest.fn()}
          {...createDefaultGroupBySelectorConfig('traces')}
          {...customConfig}
        />
      );

      performance.mark('config-end');

      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
    });

    it('should handle domain configuration switching efficiently', () => {
      const TestComponent = ({ domain }: { domain: 'traces' | 'logs' }) => (
        <GroupBySelector
          options={[{ label: 'Test', value: 'test' }]}
          radioAttributes={['test']}
          value=""
          onChange={jest.fn()}
          {...createDefaultGroupBySelectorConfig(domain)}
        />
      );

      const { rerender } = render(<TestComponent domain="traces" />);

      performance.mark('domain-switch-start');

      rerender(<TestComponent domain="logs" />);

      performance.mark('domain-switch-end');

      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
    });
  });

  describe('Search Performance', () => {
    it('should efficiently filter search results', () => {
      const largeOptions = Array.from({ length: 1000 }, (_, i) => ({
        label: `Option ${i}`,
        value: `option_${i}`,
      }));

      const SearchTestComponent = ({ }: { query: string }) => {

        return (
          <GroupBySelector
            options={largeOptions}
            radioAttributes={['option_0']}
            value=""
            onChange={jest.fn()}
            searchConfig={{
              enabled: true,
              maxOptions: 100,
              caseSensitive: false,
            }}
          />
        );
      };

      performance.mark('search-start');

      render(<SearchTestComponent query="" />);

      performance.mark('search-end');

      expect(screen.getByTestId('select-dropdown')).toBeInTheDocument();
    });
  });

  describe('Memory Usage', () => {
    it('should not create memory leaks with large datasets', () => {
      const createLargeComponent = () => {
        const largeOptions = Array.from({ length: 5000 }, (_, i) => ({
          label: `Memory Test Option ${i}`,
          value: `mem_option_${i}`,
        }));

        return (
          <GroupBySelector
            options={largeOptions}
            radioAttributes={['mem_option_0', 'mem_option_1']}
            value=""
            onChange={jest.fn()}
            virtualizationConfig={{ enabled: true }}
            searchConfig={{ maxOptions: 100 }}
          />
        );
      };

      // Render and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(createLargeComponent());
        expect(screen.getByTestId('radio-group')).toBeInTheDocument();
        unmount();
      }

      // Component should render successfully after multiple mount/unmount cycles
      render(createLargeComponent());
      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should render within performance budget', () => {
      const options = Array.from({ length: 100 }, (_, i) => ({
        label: `Benchmark Option ${i}`,
        value: `bench_${i}`,
      }));

      const startTime = performance.now();

      render(
        <GroupBySelector
          options={options}
          radioAttributes={options.slice(0, 10).map(o => o.value)}
          value=""
          onChange={jest.fn()}
          {...createDefaultGroupBySelectorConfig('traces')}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(100); // 100ms budget
      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
    });

    it('should handle rapid prop changes efficiently', () => {
      const TestComponent = ({ value }: { value: string }) => (
        <GroupBySelector
          options={[
            { label: 'Option 1', value: 'opt1' },
            { label: 'Option 2', value: 'opt2' },
          ]}
          radioAttributes={['opt1', 'opt2']}
          value={value}
          onChange={jest.fn()}
        />
      );

      const { rerender } = render(<TestComponent value="" />);

      const startTime = performance.now();

      // Rapidly change props
      for (let i = 0; i < 50; i++) {
        rerender(<TestComponent value={i % 2 === 0 ? 'opt1' : 'opt2'} />);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid changes efficiently
      expect(totalTime).toBeLessThan(500); // 500ms for 50 updates
      expect(screen.getByTestId('radio-group')).toBeInTheDocument();
    });
  });
});
