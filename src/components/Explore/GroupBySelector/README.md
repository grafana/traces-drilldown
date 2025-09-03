# GroupBySelectorV2

A refactored, stateless, and reusable group-by selector component for Grafana drilldown applications.

## Overview

`GroupBySelectorV2` is a complete refactoring of the original `GroupBySelector` component, designed to be:
- **Stateless**: All state is passed via props, no scene graph dependencies
- **Reusable**: Can be used across different Grafana drilldown applications
- **Configurable**: Extensive configuration options for different domains and use cases
- **Type-safe**: Full TypeScript support with comprehensive type definitions

## Features

- **Dual Interface**: Radio buttons for common attributes + dropdown for additional options
- **Responsive Design**: Radio buttons dynamically hide/show based on available width
- **Domain Configurations**: Pre-built configurations for traces, logs, metrics, and custom domains
- **Advanced Filtering**: Configurable attribute filtering based on active filters and metrics
- **Search Support**: Built-in search functionality in the dropdown
- **Virtualization**: Efficient rendering for large attribute lists
- **Accessibility**: Full keyboard navigation and screen reader support

## Basic Usage

```tsx
import { GroupBySelectorV2, createDefaultGroupBySelectorConfig } from './GroupBySelectorV2';

function MyComponent() {
  const [selectedAttribute, setSelectedAttribute] = useState('');

  const attributeOptions = [
    { label: 'Service Name', value: 'service.name' },
    { label: 'Operation Name', value: 'operation.name' },
    // ... more options
  ];

  return (
    <GroupBySelectorV2
      options={attributeOptions}
      radioAttributes={['service.name', 'operation.name']}
      value={selectedAttribute}
      onChange={setSelectedAttribute}
      {...createDefaultGroupBySelectorConfig('traces')}
    />
  );
}
```

## Migration from Legacy Component

### Using the Adapter (Temporary)

For existing code using the legacy component:

```tsx
// Before (legacy)
<GroupBySelector
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  model={model}
/>

// After (with adapter)
import { GroupBySelectorV2, createGroupBySelectorPropsWithAdapter } from './GroupBySelectorV2';

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

### Direct Migration (Recommended)

```tsx
// Extract state manually for full control
const traceExploration = getTraceExplorationScene(model);
const filtersVariable = getFiltersVariable(model);
const metricVariable = getMetricVariable(model);

<GroupBySelectorV2
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

## Configuration

### Domain Configurations

Pre-built configurations for common domains:

```tsx
// Traces domain
const tracesConfig = createDefaultGroupBySelectorConfig('traces');

// Logs domain
const logsConfig = createDefaultGroupBySelectorConfig('logs');

// Metrics domain
const metricsConfig = createDefaultGroupBySelectorConfig('metrics');

// Custom domain
const customConfig = createDefaultGroupBySelectorConfig('custom');
```

### Custom Configuration

```tsx
<GroupBySelectorV2
  options={attributeOptions}
  radioAttributes={radioAttributes}
  value={selectedAttribute}
  onChange={handleChange}

  // Custom attribute prefixes
  attributePrefixes={{
    span: 'span.',
    resource: 'resource.',
    custom: 'custom.',
  }}

  // Custom filtering rules
  filteringRules={{
    excludeFilteredFromRadio: true,
    excludeAttributesForMetrics: {
      'rate': ['status'],
      'errors': ['status'],
    },
    excludeAttributesForFilters: {
      'nestedSetParent': ['rootName', 'rootServiceName'],
    },
  }}

  // Custom ignored attributes
  ignoredAttributes={['duration', 'timestamp']}

  // Layout customization
  layoutConfig={{
    additionalWidthPerItem: 50,
    widthOfOtherAttributes: 200,
    enableResponsiveRadioButtons: true,
  }}

  // Search configuration
  searchConfig={{
    enabled: true,
    maxOptions: 500,
    caseSensitive: false,
  }}
/>
```

## Props Reference

### Core Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `Array<SelectableValue<string>>` | ✓ | Available attribute options |
| `radioAttributes` | `string[]` | ✓ | Attributes to show as radio buttons |
| `value` | `string` | ✗ | Currently selected attribute |
| `onChange` | `(label: string, ignore?: boolean) => void` | ✓ | Selection change handler |
| `showAll` | `boolean` | ✗ | Show "All" option |

### State Props

| Prop | Type | Description |
|------|------|-------------|
| `filters` | `FilterConfig[]` | Active filters for exclusion logic |
| `currentMetric` | `string` | Current metric for conditional filtering |
| `initialGroupBy` | `string` | Initial selection value |

### Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fieldLabel` | `string` | `"Group by"` | Field label text |
| `selectPlaceholder` | `string` | `"Other attributes"` | Select placeholder |
| `attributePrefixes` | `AttributePrefixConfig` | `{}` | Attribute prefix configuration |

### Configuration Props

| Prop | Type | Description |
|------|------|-------------|
| `filteringRules` | `FilteringRulesConfig` | Attribute filtering rules |
| `ignoredAttributes` | `string[]` | Attributes to exclude |
| `layoutConfig` | `LayoutConfig` | Layout and sizing options |
| `searchConfig` | `SearchConfig` | Search functionality options |
| `virtualizationConfig` | `VirtualizationConfig` | Virtualization settings |

## Type Definitions

### FilterConfig
```tsx
interface FilterConfig {
  key: string;
  operator: string;
  value: string;
}
```

### FilteringRulesConfig
```tsx
interface FilteringRulesConfig {
  excludeFilteredFromRadio?: boolean;
  excludeAttributesForMetrics?: Record<string, string[]>;
  excludeAttributesForFilters?: Record<string, string[]>;
  customAttributeFilter?: (attribute: string, context: FilterContext) => boolean;
}
```

### LayoutConfig
```tsx
interface LayoutConfig {
  additionalWidthPerItem?: number;
  widthOfOtherAttributes?: number;
  maxSelectWidth?: number;
  enableResponsiveRadioButtons?: boolean;
}
```

## Utility Functions

### createDefaultGroupBySelectorConfig
Creates domain-specific default configurations:
```tsx
const config = createDefaultGroupBySelectorConfig('traces');
```

### createGroupBySelectorAdapter
Creates adapter configuration from legacy scene models:
```tsx
const adapterConfig = createGroupBySelectorAdapter(model);
```

### processRadioAttributes
Processes radio attributes with filtering and width calculations:
```tsx
const radioOptions = processRadioAttributes(
  radioAttributes,
  options,
  filters,
  rules,
  context,
  prefixes,
  fontSize,
  availableWidth,
  additionalWidth,
  selectWidth
);
```

## Testing

The component includes comprehensive tests covering:
- Basic rendering
- Configuration options
- Domain-specific setups
- Filter applications
- Responsive behavior

Run tests with:
```bash
npm test GroupBySelectorV2
```

## Performance Considerations

- **Memoization**: Heavy computations are memoized with `useMemo`
- **Virtualization**: Large option lists use virtualization
- **Responsive**: Radio buttons dynamically adjust to available width
- **Debounced Search**: Search input is optimized for performance

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA attributes
- **Focus Management**: Logical focus order
- **High Contrast**: Theme-aware styling

## Migration Timeline

1. **Phase 1**: New component alongside legacy (current)
2. **Phase 2**: Gradual migration using adapter
3. **Phase 3**: Direct migration to new props
4. **Phase 4**: Remove legacy component and adapter

## Contributing

When contributing to this component:

1. Maintain backward compatibility during migration
2. Add comprehensive tests for new features
3. Update documentation for any API changes
4. Follow the established TypeScript patterns
5. Ensure accessibility standards are met
