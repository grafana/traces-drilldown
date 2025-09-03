# GroupBySelector Component Refactoring Specifications

## Executive Summary

This document outlines the comprehensive refactoring plan for the `GroupBySelector` component to transform it from a tightly coupled, domain-specific component into a reusable, stateless UI component suitable for use across multiple Grafana drilldown applications.

## Current State Analysis

### Existing Implementation Overview

The current `GroupBySelector` component (`src/components/Explore/GroupBySelector.tsx`) is a 189-line React component that provides a dual-interface selection mechanism:
- **Radio buttons** for frequently used attributes (dynamically shown based on available width)
- **Select dropdown** for additional attributes with search functionality

### Current Dependencies and Tight Coupling Issues

#### 1. Scene Graph Dependencies
- **`getTraceExplorationScene(model)`**: Accesses trace exploration state for `initialGroupBy`
- **`getFiltersVariable(model)`**: Retrieves active filters from scene graph
- **`getMetricVariable(model)`**: Gets current metric function (rate, errors, duration)

#### 2. Domain-Specific Business Logic
- **Traces-specific filtering**: Hard-coded logic for `rootName`, `rootServiceName`, and `status` attributes
- **Metric-based exclusions**: Removes `status` attribute when `rate` or `errors` metrics are selected
- **Filter-based exclusions**: Removes attributes that are already in active filters
- **Nested set filtering**: Special handling for `nestedSetParent` filters

#### 3. Constants and Type Dependencies
- **Attribute prefixes**: `SPAN_ATTR` ("span."), `RESOURCE_ATTR` ("resource.")
- **Ignored attributes**: Hard-coded list from `utils/shared`
- **Radio attribute lists**: `radioAttributesSpan`, `radioAttributesResource`
- **Metric types**: `MetricFunction` type from traces domain

#### 4. Model Type Coupling
- **Scene object dependency**: Requires `AttributesBreakdownScene | AttributesComparisonScene`
- **Change handler coupling**: `onChange` method tied to specific scene implementations

### Current Usage Patterns

The component is currently used in two locations:

1. **AttributesComparisonScene** (line 217-224):
```typescript
<GroupBySelector
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  model={model}
/>
```

2. **AttributesBreakdownScene** (similar pattern with different radioAttributes)

## Refactoring Objectives

### Primary Goals
1. **Eliminate Scene Graph Dependencies**: Remove all direct scene graph access
2. **Extract Business Logic**: Make filtering rules configurable rather than hard-coded
3. **Improve Reusability**: Enable use across different Grafana drilldown applications
4. **Maintain Functionality**: Preserve all existing behavior and visual appearance
5. **Ensure Type Safety**: Maintain strong TypeScript typing throughout

### Secondary Goals
1. **Performance Optimization**: Maintain current resize-based radio button optimization
2. **Accessibility**: Preserve existing accessibility features
3. **Testability**: Improve component testability through reduced dependencies
4. **Documentation**: Provide comprehensive usage documentation

## Proposed Architecture

### New Component Interface

```typescript
export interface GroupBySelectorProps {
  // Core Selection Interface
  options: Array<SelectableValue<string>>;
  radioAttributes: string[];
  value?: string;
  onChange: (label: string, ignore?: boolean) => void;
  showAll?: boolean;

  // State Data (previously from scene graph)
  filters?: FilterConfig[];
  currentMetric?: string;
  initialGroupBy?: string;

  // Display Configuration
  attributePrefixes?: AttributePrefixConfig;
  fieldLabel?: string;
  selectPlaceholder?: string;

  // Filtering Rules Configuration
  filteringRules?: FilteringRulesConfig;
  ignoredAttributes?: string[];

  // Layout and Sizing
  layoutConfig?: LayoutConfig;

  // Advanced Options
  searchConfig?: SearchConfig;
  virtualizationConfig?: VirtualizationConfig;
}
```

### Supporting Type Definitions

```typescript
export interface FilterConfig {
  key: string;
  operator: string;
  value: string;
}

export interface AttributePrefixConfig {
  span?: string;
  resource?: string;
  event?: string;
  [key: string]: string | undefined;
}

export interface FilteringRulesConfig {
  // Exclude attributes from radio buttons when they're in active filters
  excludeFilteredFromRadio?: boolean;

  // Exclude specific attributes when certain metrics are selected
  excludeAttributesForMetrics?: Record<string, string[]>;

  // Exclude specific attributes when certain filters are active
  excludeAttributesForFilters?: Record<string, string[]>;

  // Custom filtering function for advanced use cases
  customAttributeFilter?: (attribute: string, context: FilterContext) => boolean;
}

export interface FilterContext {
  filters: FilterConfig[];
  currentMetric?: string;
  availableOptions: Array<SelectableValue<string>>;
}

export interface LayoutConfig {
  additionalWidthPerItem?: number;
  widthOfOtherAttributes?: number;
  maxSelectWidth?: number;
  enableResponsiveRadioButtons?: boolean;
}

export interface SearchConfig {
  enabled?: boolean;
  maxOptions?: number;
  caseSensitive?: boolean;
  searchFields?: ('label' | 'value')[];
}

export interface VirtualizationConfig {
  enabled?: boolean;
  itemHeight?: number;
  maxHeight?: number;
}
```

### Default Configuration Provider

```typescript
export const createDefaultGroupBySelectorConfig = (
  domain: 'traces' | 'logs' | 'metrics' | 'custom'
): Partial<GroupBySelectorProps> => {
  switch (domain) {
    case 'traces':
      return {
        attributePrefixes: {
          span: 'span.',
          resource: 'resource.',
          event: 'event.',
        },
        filteringRules: {
          excludeFilteredFromRadio: true,
          excludeAttributesForMetrics: {
            'rate': ['status'],
            'errors': ['status'],
          },
          excludeAttributesForFilters: {
            'nestedSetParent': ['rootName', 'rootServiceName'],
          },
        },
        ignoredAttributes: [
          'duration', 'event:name', 'nestedSetLeft', 'nestedSetParent',
          'nestedSetRight', 'span:duration', 'span:id', 'trace:duration',
          'trace:id', 'traceDuration',
        ],
        layoutConfig: {
          additionalWidthPerItem: 40,
          widthOfOtherAttributes: 180,
          enableResponsiveRadioButtons: true,
        },
        searchConfig: {
          enabled: true,
          maxOptions: 1000,
          caseSensitive: false,
          searchFields: ['label', 'value'],
        },
        virtualizationConfig: {
          enabled: true,
        },
      };
    // ... other domain configurations
    default:
      return {};
  }
};
```

## Implementation Plan

### Phase 1: Core Refactoring

#### 1.1 Create New Component Structure
- Extract business logic into separate utility functions
- Create new props interface with backward compatibility
- Implement configuration-driven filtering logic
- Maintain existing internal state management (resize observer, select query)

#### 1.2 Extract Filtering Logic
```typescript
// New utility functions
export const createAttributeFilter = (
  rules: FilteringRulesConfig,
  context: FilterContext
) => (attribute: string): boolean => {
  // Implementation of configurable filtering logic
};

export const processRadioAttributes = (
  radioAttributes: string[],
  options: Array<SelectableValue<string>>,
  filters: FilterConfig[],
  rules: FilteringRulesConfig,
  context: FilterContext
): ProcessedAttribute[] => {
  // Implementation of radio attribute processing
};
```

#### 1.3 Create Adapter Layer
```typescript
// Temporary adapter for backward compatibility
export const createGroupBySelectorAdapter = (
  model: AttributesBreakdownScene | AttributesComparisonScene
): Partial<GroupBySelectorProps> => {
  const traceExploration = getTraceExplorationScene(model);
  const filtersVariable = getFiltersVariable(model);
  const metricVariable = getMetricVariable(model);

  return {
    filters: filtersVariable.state.filters.map(f => ({
      key: f.key,
      operator: f.operator,
      value: f.value,
    })),
    currentMetric: metricVariable.state.value as string,
    initialGroupBy: traceExploration.state.initialGroupBy,
    ...createDefaultGroupBySelectorConfig('traces'),
  };
};
```

### Phase 2: Migration Strategy

#### 2.1 Gradual Migration Approach
1. **Step 1**: Create new component (`GroupBySelectorV2`) alongside existing one
2. **Step 2**: Update existing usage sites to use adapter with legacy component
3. **Step 3**: Migrate usage sites to new component with proper props
4. **Step 4**: Validate functionality and performance
5. **Step 5**: Rename `GroupBySelectorV2` → `GroupBySelector` and remove legacy component

#### 2.2 Component Naming Strategy
- **Legacy component**: `GroupBySelector` (keeps original name during migration)
- **New component**: `GroupBySelectorV2` (temporary name during development)
- **Adapter**: `GroupBySelectorAdapter` (temporary)
- **Final step**: Rename `GroupBySelectorV2` → `GroupBySelector` and remove legacy component

### Phase 3: Advanced Features

#### 3.1 Enhanced Configuration
- Plugin system for custom filtering rules
- Theme-aware styling configuration
- Accessibility configuration options
- Performance optimization settings

#### 3.2 Additional Domains Support
- Logs domain configuration
- Metrics domain configuration
- Custom domain configuration templates

## Component API Reference

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `options` | `Array<SelectableValue<string>>` | ✓ | - | Available attribute options for selection |
| `radioAttributes` | `string[]` | ✓ | - | Attributes to show as radio buttons |
| `value` | `string` | ✗ | `undefined` | Currently selected attribute |
| `onChange` | `(label: string, ignore?: boolean) => void` | ✓ | - | Selection change handler |
| `showAll` | `boolean` | ✗ | `false` | Whether to show "All" option |
| `filters` | `FilterConfig[]` | ✗ | `[]` | Active filters for exclusion logic |
| `currentMetric` | `string` | ✗ | `undefined` | Current metric for conditional filtering |
| `initialGroupBy` | `string` | ✗ | `undefined` | Initial selection value |
| `attributePrefixes` | `AttributePrefixConfig` | ✗ | `{}` | Attribute prefix configuration |
| `fieldLabel` | `string` | ✗ | `"Group by"` | Field label text |
| `selectPlaceholder` | `string` | ✗ | `"Other attributes"` | Select placeholder text |
| `filteringRules` | `FilteringRulesConfig` | ✗ | `{}` | Attribute filtering rules |
| `ignoredAttributes` | `string[]` | ✗ | `[]` | Attributes to exclude from options |
| `layoutConfig` | `LayoutConfig` | ✗ | default | Layout and sizing configuration |
| `searchConfig` | `SearchConfig` | ✗ | default | Search functionality configuration |
| `virtualizationConfig` | `VirtualizationConfig` | ✗ | default | Virtualization settings |

### Methods

The component exposes no public methods as it's designed to be fully controlled through props.

### Events

| Event | Type | Description |
|-------|------|-------------|
| `onChange` | `(label: string, ignore?: boolean) => void` | Fired when selection changes |

## Migration Guide

### For Existing Usage

#### Before (Current Implementation)
```typescript
<GroupBySelector
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  model={model}
/>
```

#### After (Refactored Implementation)
```typescript
<GroupBySelector
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  filters={filtersVariable.state.filters}
  currentMetric={metricVariable.state.value}
  initialGroupBy={traceExploration.state.initialGroupBy}
  {...createDefaultGroupBySelectorConfig('traces')}
/>
```

#### Using the Adapter (Temporary)
```typescript
<GroupBySelector
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  {...createGroupBySelectorAdapter(model)}
/>
```

### For New Implementations

#### Traces Domain
```typescript
import { GroupBySelector, createDefaultGroupBySelectorConfig } from '@grafana/scenes';

<GroupBySelector
  options={attributeOptions}
  radioAttributes={['service.name', 'operation.name', 'status']}
  value={selectedAttribute}
  onChange={handleAttributeChange}
  filters={activeFilters}
  currentMetric="duration"
  {...createDefaultGroupBySelectorConfig('traces')}
/>
```

#### Custom Domain
```typescript
<GroupBySelector
  options={attributeOptions}
  radioAttributes={customRadioAttributes}
  value={selectedAttribute}
  onChange={handleAttributeChange}
  attributePrefixes={{
    custom: 'custom.',
    system: 'system.',
  }}
  filteringRules={{
    excludeFilteredFromRadio: true,
    excludeAttributesForMetrics: {
      'error_rate': ['status_code'],
    },
  }}
  ignoredAttributes={['internal_id', 'timestamp']}
/>
```

## Testing Strategy

### Unit Tests
- **Component rendering**: Test all prop combinations
- **Filtering logic**: Test attribute filtering rules
- **Responsive behavior**: Test radio button width calculations
- **Search functionality**: Test select dropdown search
- **State management**: Test internal state updates

### Integration Tests
- **Scene integration**: Test with adapter layer
- **Domain configurations**: Test default configurations
- **Performance**: Test with large attribute sets
- **Accessibility**: Test keyboard navigation and screen readers

### Migration Tests
- **Backward compatibility**: Ensure existing usage continues to work
- **Feature parity**: Verify all existing functionality is preserved
- **Performance regression**: Ensure no performance degradation

## Performance Considerations

### Optimizations Maintained
- **Resize observer**: Dynamic radio button visibility based on available width
- **Text measurement**: Accurate width calculations for responsive behavior
- **Virtualization**: Efficient rendering of large option lists
- **Memoization**: Optimized re-rendering with useMemo hooks

### New Performance Features
- **Configuration caching**: Cache processed configurations
- **Filtering optimization**: Efficient attribute filtering algorithms
- **Bundle size**: Tree-shakeable configuration modules

## Accessibility

### Maintained Features
- **Field labeling**: Proper form field labeling
- **Keyboard navigation**: Full keyboard support for both radio buttons and select
- **Screen reader support**: Proper ARIA attributes
- **Focus management**: Logical focus order

### Enhanced Features
- **Configurable labels**: Customizable accessibility labels
- **High contrast support**: Theme-aware styling
- **Reduced motion support**: Respect user motion preferences

## Documentation Requirements

### Component Documentation
- **Props reference**: Complete TypeScript interface documentation
- **Usage examples**: Multiple domain examples
- **Migration guide**: Step-by-step migration instructions
- **Configuration guide**: Domain-specific configuration examples

### Developer Documentation
- **Architecture overview**: Component design principles
- **Extension guide**: How to add new domains
- **Testing guide**: Component testing best practices
- **Performance guide**: Optimization recommendations

## Risk Assessment

### High Risk
- **Breaking changes**: Potential for breaking existing implementations
- **Performance regression**: Risk of performance degradation during migration
- **Feature gaps**: Missing functionality in refactored version

### Medium Risk
- **Type safety**: Potential TypeScript compilation issues
- **Bundle size**: Increased bundle size from additional configuration
- **Complexity**: Increased component complexity

### Low Risk
- **Styling changes**: Minor visual differences
- **Documentation gaps**: Incomplete migration documentation

### Mitigation Strategies
- **Gradual migration**: Phase-based implementation approach
- **Comprehensive testing**: Extensive test coverage
- **Backward compatibility**: Adapter layer for smooth transition
- **Performance monitoring**: Continuous performance validation

## Success Metrics

### Technical Metrics
- **Bundle size**: No significant increase in bundle size
- **Performance**: No regression in rendering performance
- **Type coverage**: 100% TypeScript coverage maintained
- **Test coverage**: >95% test coverage achieved

### Usability Metrics
- **Migration effort**: <2 hours per existing usage site
- **Configuration complexity**: <10 lines of configuration for common use cases
- **Documentation completeness**: All public APIs documented
- **Developer satisfaction**: Positive feedback from development team

## Timeline and Milestones

### Phase 1: Foundation (2-3 weeks)
- [ ] Complete component interface design
- [ ] Implement core refactored component (`GroupBySelectorV2`)
- [ ] Create utility functions for filtering logic
- [ ] Develop adapter layer for backward compatibility

### Phase 2: Integration (1-2 weeks)
- [ ] Update existing usage sites with adapter
- [ ] Migrate usage sites to new component
- [ ] Implement comprehensive test suite
- [ ] Create domain-specific configurations
- [ ] Performance testing and optimization

### Phase 3: Documentation and Cleanup (1 week)
- [ ] Complete component documentation
- [ ] Create migration guide
- [ ] Rename `GroupBySelectorV2` → `GroupBySelector`
- [ ] Remove legacy component and adapters
- [ ] Final testing and validation

### Total Estimated Timeline: 4-6 weeks

## Conclusion

This refactoring will transform the `GroupBySelector` from a tightly coupled, domain-specific component into a flexible, reusable UI component suitable for use across multiple Grafana drilldown applications. The proposed architecture maintains all existing functionality while providing the flexibility needed for broader adoption.

The gradual migration strategy ensures minimal disruption to existing implementations while providing a clear path forward for new use cases. The comprehensive configuration system allows for domain-specific customization without sacrificing the component's reusability.

Success of this refactoring will be measured by the component's adoption across other drilldown applications and the reduction in code duplication for similar UI patterns throughout the Grafana ecosystem.
