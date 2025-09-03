# GroupBySelectorV2 API Documentation

## Overview

`GroupBySelectorV2` is a fully refactored, stateless, and reusable group-by selector component designed for Grafana drilldown applications. It provides a dual-interface selection mechanism with radio buttons for common attributes and a searchable dropdown for additional options.

## Table of Contents

- [Quick Start](#quick-start)
- [Props Reference](#props-reference)
- [Configuration System](#configuration-system)
- [Domain Configurations](#domain-configurations)
- [Advanced Usage](#advanced-usage)
- [Migration Guide](#migration-guide)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Usage

```tsx
import { GroupBySelectorV2, createDefaultGroupBySelectorConfig } from './GroupBySelectorV2';

function MyComponent() {
  const [selectedAttribute, setSelectedAttribute] = useState('');
  
  const attributeOptions = [
    { label: 'Service Name', value: 'service.name' },
    { label: 'Operation Name', value: 'operation.name' },
    { label: 'Status', value: 'status' },
  ];

  const radioAttributes = ['service.name', 'operation.name'];

  return (
    <GroupBySelectorV2
      options={attributeOptions}
      radioAttributes={radioAttributes}
      value={selectedAttribute}
      onChange={(value) => setSelectedAttribute(value)}
      {...createDefaultGroupBySelectorConfig('traces')}
    />
  );
}
```

### With Custom Configuration

```tsx
<GroupBySelectorV2
  options={attributeOptions}
  radioAttributes={radioAttributes}
  value={selectedAttribute}
  onChange={handleChange}
  showAll={true}
  filters={[{ key: 'status', operator: '=', value: 'error' }]}
  currentMetric="rate"
  attributePrefixes={{ span: 'span.', resource: 'resource.' }}
  filteringRules={{
    excludeFilteredFromRadio: true,
    excludeAttributesForMetrics: { 'rate': ['status'] },
  }}
  ignoredAttributes={['duration', 'timestamp']}
/>
```

## Props Reference

### Core Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `options` | `Array<SelectableValue<string>>` | ✓ | - | Available attribute options for selection |
| `radioAttributes` | `string[]` | ✓ | - | Attributes to display as radio buttons |
| `value` | `string` | ✗ | `undefined` | Currently selected attribute |
| `onChange` | `(label: string, ignore?: boolean) => void` | ✓ | - | Selection change handler |
| `showAll` | `boolean` | ✗ | `false` | Whether to show "All" option in radio buttons |

### State Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | `FilterConfig[]` | `[]` | Active filters for exclusion logic |
| `currentMetric` | `string` | `undefined` | Current metric for conditional filtering |
| `initialGroupBy` | `string` | `undefined` | Initial selection value for auto-selection |

### Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fieldLabel` | `string` | `"Group by"` | Label text for the field |
| `selectPlaceholder` | `string` | `"Other attributes"` | Placeholder text for the select dropdown |
| `attributePrefixes` | `AttributePrefixConfig` | `{}` | Configuration for attribute prefix removal |

### Configuration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filteringRules` | `FilteringRulesConfig` | `{}` | Rules for attribute filtering and exclusion |
| `ignoredAttributes` | `string[]` | `[]` | Attributes to exclude from all options |
| `layoutConfig` | `LayoutConfig` | default | Layout and responsive behavior settings |
| `searchConfig` | `SearchConfig` | default | Search functionality configuration |
| `virtualizationConfig` | `VirtualizationConfig` | default | Performance optimization settings |

## Configuration System

### FilterConfig

Represents an active filter that affects attribute visibility.

```typescript
interface FilterConfig {
  key: string;      // Attribute key (e.g., 'status')
  operator: string; // Filter operator ('=', '!=', '>', '<', etc.)
  value: string;    // Filter value (e.g., 'error')
}
```

### AttributePrefixConfig

Defines prefixes to remove from attribute labels for cleaner display.

```typescript
interface AttributePrefixConfig {
  span?: string;      // e.g., 'span.'
  resource?: string;  // e.g., 'resource.'
  event?: string;     // e.g., 'event.'
  [key: string]: string | undefined; // Custom prefixes
}
```

### FilteringRulesConfig

Controls how attributes are filtered based on context.

```typescript
interface FilteringRulesConfig {
  // Exclude attributes from radio buttons when they're in active filters
  excludeFilteredFromRadio?: boolean;
  
  // Exclude specific attributes when certain metrics are selected
  excludeAttributesForMetrics?: Record<string, string[]>;
  
  // Exclude specific attributes when certain filters are active
  excludeAttributesForFilters?: Record<string, string[]>;
  
  // Custom filtering function for advanced use cases
  customAttributeFilter?: (attribute: string, context: FilterContext) => boolean;
}
```

### LayoutConfig

Controls responsive behavior and sizing.

```typescript
interface LayoutConfig {
  additionalWidthPerItem?: number;        // Extra width per radio button (default: 40)
  widthOfOtherAttributes?: number;        // Width reserved for select (default: 180)
  maxSelectWidth?: number;                // Maximum select width
  enableResponsiveRadioButtons?: boolean; // Enable responsive hiding (default: true)
}
```

### SearchConfig

Configures search functionality in the dropdown.

```typescript
interface SearchConfig {
  enabled?: boolean;                      // Enable search (default: true)
  maxOptions?: number;                    // Maximum options shown (default: 1000)
  caseSensitive?: boolean;                // Case sensitive search (default: false)
  searchFields?: Array<'label' | 'value'>; // Fields to search in (default: ['label', 'value'])
}
```

### VirtualizationConfig

Performance optimization settings for large option lists.

```typescript
interface VirtualizationConfig {
  enabled?: boolean;    // Enable virtualization (default: true)
  itemHeight?: number;  // Height of each item in pixels
  maxHeight?: number;   // Maximum dropdown height
}
```

## Domain Configurations

### Available Domains

The component provides pre-configured setups for common domains:

- `'traces'` - OpenTelemetry distributed tracing
- `'logs'` - Structured logging systems
- `'metrics'` - Prometheus-style metrics
- `'custom'` - Flexible custom configuration

### Using Domain Configurations

```typescript
import { createDefaultGroupBySelectorConfig } from './GroupBySelectorV2';

// Get traces domain configuration
const tracesConfig = createDefaultGroupBySelectorConfig('traces');

// Use with component
<GroupBySelectorV2
  options={options}
  radioAttributes={radioAttributes}
  value={value}
  onChange={onChange}
  {...tracesConfig}
/>
```

### Traces Domain Configuration

Optimized for OpenTelemetry distributed tracing:

```typescript
{
  attributePrefixes: {
    span: 'span.',
    resource: 'resource.',
    event: 'event.',
  },
  filteringRules: {
    excludeFilteredFromRadio: true,
    excludeAttributesForMetrics: {
      'rate': ['status'],      // Hide status when rate metric selected
      'errors': ['status'],    // Hide status when errors metric selected
    },
    excludeAttributesForFilters: {
      'nestedSetParent': ['rootName', 'rootServiceName'], // Hide when full traces selected
    },
  },
  ignoredAttributes: [
    'duration', 'event:name', 'nestedSetLeft', 'nestedSetParent',
    'nestedSetRight', 'span:duration', 'span:id', 'trace:duration',
    'trace:id', 'traceDuration',
  ],
  // ... layout, search, and virtualization defaults
}
```

### Logs Domain Configuration

Optimized for structured logging:

```typescript
{
  attributePrefixes: {
    log: 'log.',
    resource: 'resource.',
  },
  filteringRules: {
    excludeFilteredFromRadio: true,
  },
  ignoredAttributes: ['timestamp', 'log:id'],
  // ... other defaults
}
```

### Metrics Domain Configuration

Optimized for Prometheus-style metrics:

```typescript
{
  attributePrefixes: {
    metric: 'metric.',
    resource: 'resource.',
  },
  filteringRules: {
    excludeFilteredFromRadio: true,
  },
  ignoredAttributes: ['__name__', 'timestamp'],
  // ... other defaults
}
```

### Custom Domain Configuration

Minimal defaults for maximum flexibility:

```typescript
{
  attributePrefixes: {},
  filteringRules: {},
  ignoredAttributes: [],
  // ... standard layout, search, and virtualization defaults
}
```

## Advanced Usage

### Custom Filtering Rules

```typescript
const customFilteringRules: FilteringRulesConfig = {
  excludeFilteredFromRadio: true,
  excludeAttributesForMetrics: {
    'error_rate': ['http.status_code'],
    'latency': ['duration'],
  },
  customAttributeFilter: (attribute, context) => {
    // Custom business logic
    if (context.currentMetric === 'security_events') {
      return !['user.id', 'session.token'].includes(attribute);
    }
    return true;
  },
};

<GroupBySelectorV2
  options={options}
  radioAttributes={radioAttributes}
  value={value}
  onChange={onChange}
  filteringRules={customFilteringRules}
/>
```

### Performance Optimization

```typescript
const performanceConfig = {
  layoutConfig: {
    enableResponsiveRadioButtons: true,
    additionalWidthPerItem: 50,
  },
  searchConfig: {
    enabled: true,
    maxOptions: 500,  // Limit for performance
  },
  virtualizationConfig: {
    enabled: true,
    itemHeight: 32,
    maxHeight: 300,
  },
};

<GroupBySelectorV2
  options={largeOptionsList}
  radioAttributes={radioAttributes}
  value={value}
  onChange={onChange}
  {...performanceConfig}
/>
```

### Multi-Domain Support

```typescript
function DomainAwareGroupBySelector({ domain, ...props }) {
  const domainConfig = createDefaultGroupBySelectorConfig(domain);
  
  return (
    <GroupBySelectorV2
      {...props}
      {...domainConfig}
    />
  );
}

// Usage
<DomainAwareGroupBySelector
  domain="traces"
  options={traceOptions}
  radioAttributes={traceRadioAttributes}
  value={value}
  onChange={onChange}
/>
```

## Migration Guide

### From Legacy GroupBySelector

#### Step 1: Import New Component

```typescript
// Before
import { GroupBySelector } from './GroupBySelector';

// After
import { GroupBySelectorV2, createGroupBySelectorPropsWithAdapter } from './GroupBySelectorV2';
```

#### Step 2: Use Adapter (Temporary)

```typescript
// Before
<GroupBySelector
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  model={model}
/>

// After (with adapter)
<GroupBySelectorV2
  {...createGroupBySelectorPropsWithAdapter({
    model,
    options: getAttributesAsOptions(attributes),
    radioAttributes: radioAttributesSpan,
    value: variable.getValueText(),
    showAll: true,
  })}
/>
```

#### Step 3: Direct Migration (Recommended)

```typescript
// Extract state manually
const filtersVariable = getFiltersVariable(model);
const metricVariable = getMetricVariable(model);
const traceExploration = getTraceExplorationScene(model);

// Use directly
<GroupBySelectorV2
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  filters={filtersVariable.state.filters.map(f => ({
    key: f.key,
    operator: f.operator,
    value: f.value,
  }))}
  currentMetric={metricVariable.state.value as string}
  initialGroupBy={traceExploration.state.initialGroupBy}
  {...createDefaultGroupBySelectorConfig('traces')}
/>
```

## Performance Considerations

### Large Dataset Optimization

- **Virtualization**: Automatically enabled for large option lists
- **Search Limiting**: Configure `maxOptions` to limit search results
- **Memoization**: Component uses React.useMemo for expensive calculations
- **Responsive Design**: Radio buttons hide/show based on available width

### Memory Management

- **No Memory Leaks**: Component properly cleans up event listeners
- **Efficient Filtering**: Filtering algorithms optimized for performance
- **Configuration Caching**: Domain configurations are cached efficiently

### Best Practices

1. **Use Domain Configurations**: Start with appropriate domain defaults
2. **Limit Options**: Use `maxOptions` for large datasets (recommended: 500-1000)
3. **Enable Virtualization**: Keep virtualization enabled for performance
4. **Optimize Radio Attributes**: Limit radio attributes to 5-10 most common options
5. **Profile Performance**: Monitor render times with large datasets

## Troubleshooting

### Common Issues

#### Radio Buttons Not Showing

**Problem**: Radio buttons don't appear even with radioAttributes provided.

**Solution**: Check if attributes exist in options and aren't filtered out:

```typescript
// Debug: Check if attributes exist in options
const debugOptions = options.filter(opt => 
  radioAttributes.includes(opt.value)
);
console.log('Available radio options:', debugOptions);

// Debug: Check filtering rules
const filterContext = { filters, currentMetric, availableOptions: options };
const attributeFilter = createAttributeFilter(filteringRules, filterContext);
const filteredRadio = radioAttributes.filter(attributeFilter);
console.log('Filtered radio attributes:', filteredRadio);
```

#### Search Not Working

**Problem**: Search functionality doesn't filter options.

**Solution**: Ensure search is enabled and configured correctly:

```typescript
<GroupBySelectorV2
  searchConfig={{
    enabled: true,
    caseSensitive: false,
    searchFields: ['label', 'value'],
  }}
  // ... other props
/>
```

#### Performance Issues

**Problem**: Component renders slowly with large datasets.

**Solution**: Optimize configuration:

```typescript
<GroupBySelectorV2
  searchConfig={{ maxOptions: 500 }}
  virtualizationConfig={{ enabled: true }}
  layoutConfig={{ enableResponsiveRadioButtons: true }}
  // ... other props
/>
```

#### TypeScript Errors

**Problem**: TypeScript compilation errors with configuration.

**Solution**: Use proper typing and configuration helpers:

```typescript
import { 
  GroupBySelectorV2Props,
  createDefaultGroupBySelectorConfig,
  DomainType 
} from './GroupBySelectorV2';

const domain: DomainType = 'traces';
const config = createDefaultGroupBySelectorConfig(domain);
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
const debugConfig = {
  ...createDefaultGroupBySelectorConfig('traces'),
  filteringRules: {
    ...createDefaultGroupBySelectorConfig('traces').filteringRules,
    customAttributeFilter: (attribute, context) => {
      console.log('Filtering attribute:', attribute, 'Context:', context);
      return true; // Your filtering logic here
    },
  },
};
```

## API Stability

This component follows semantic versioning:

- **Major Version**: Breaking changes to public API
- **Minor Version**: New features, backward compatible
- **Patch Version**: Bug fixes, backward compatible

Current version: `2.0.0` (refactored from legacy GroupBySelector)

## Support

For issues, questions, or contributions:

1. Check this documentation first
2. Review the test files for usage examples
3. Check TypeScript definitions for detailed type information
4. Refer to domain examples for advanced usage patterns

## Changelog

### v2.0.0 (Current)
- Complete refactoring from legacy GroupBySelector
- Added multi-domain support (traces, logs, metrics, custom)
- Implemented configurable filtering rules
- Added performance optimizations (virtualization, memoization)
- Full TypeScript support with comprehensive type definitions
- Backward compatibility through adapter layer

### Migration Timeline
- **Phase 1**: Foundation (Component creation)
- **Phase 2**: Integration (Usage site updates)
- **Phase 3**: Documentation and Cleanup (Current)
- **Phase 4**: Legacy removal (Planned)
