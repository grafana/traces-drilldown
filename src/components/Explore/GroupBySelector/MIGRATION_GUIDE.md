# GroupBySelector Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the legacy `GroupBySelector` to the new `GroupBySelectorV2` component. The migration can be done gradually with zero downtime using the provided adapter layer.

## Table of Contents

- [Migration Strategy](#migration-strategy)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Step-by-Step Migration](#step-by-step-migration)
- [Validation and Testing](#validation-and-testing)
- [Troubleshooting](#troubleshooting)
- [Rollback Plan](#rollback-plan)

## Migration Strategy

### Two-Path Approach

1. **Adapter Migration** (Recommended First Step)
   - Zero code changes to existing usage
   - Immediate compatibility with new component
   - Safe fallback if issues arise

2. **Direct Migration** (Optimal Long-term)
   - Full access to new features
   - Better performance
   - Cleaner code without adapter overhead

### Migration Timeline

```
Week 1-2: Adapter Migration (All sites)
Week 3-4: Direct Migration (Critical paths)
Week 5-6: Direct Migration (Remaining sites)
Week 7: Legacy cleanup and final testing
```

## Pre-Migration Checklist

### 1. Environment Setup

- [ ] Ensure TypeScript compilation is working
- [ ] Verify test suite is running
- [ ] Backup current implementation
- [ ] Set up feature flag (if available)

### 2. Dependency Analysis

- [ ] Identify all usage sites of `GroupBySelector`
- [ ] Document current props and behavior
- [ ] Identify any custom modifications
- [ ] Check for integration test coverage

### 3. Find All Usage Sites

```bash
# Find all files using GroupBySelector
grep -r "GroupBySelector" src/ --include="*.tsx" --include="*.ts"

# Find import statements
grep -r "import.*GroupBySelector" src/ --include="*.tsx" --include="*.ts"
```

## Step-by-Step Migration

### Phase 1: Adapter Migration

#### Step 1.1: Update Imports

**Before:**
```typescript
import { GroupBySelector } from './GroupBySelector';
```

**After:**
```typescript
import { GroupBySelectorV2, createGroupBySelectorPropsWithAdapter } from './GroupBySelectorV2';
```

#### Step 1.2: Replace Component Usage

**Before:**
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

**After:**
```typescript
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

#### Step 1.3: Test Adapter Migration

```typescript
// Add temporary logging to verify adapter works
const adapterProps = createGroupBySelectorPropsWithAdapter({
  model,
  options: getAttributesAsOptions(attributes),
  radioAttributes: radioAttributesSpan,
  value: variable.getValueText(),
  showAll: true,
});

console.log('Adapter props:', adapterProps); // Remove after testing

<GroupBySelectorV2 {...adapterProps} />
```

### Phase 2: Direct Migration

#### Step 2.1: Extract Scene State

```typescript
// Add state extraction
const filtersVariable = getFiltersVariable(model);
const metricVariable = getMetricVariable(model);
const traceExploration = getTraceExplorationScene(model);

// Get state values
const { initialGroupBy } = traceExploration.useState();
const { filters } = filtersVariable.useState();
const { value: metric } = metricVariable.useState();
```

#### Step 2.2: Convert to Direct Props

```typescript
<GroupBySelectorV2
  // Core props (unchanged)
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  
  // Extracted state
  filters={filters.map(f => ({ 
    key: f.key, 
    operator: f.operator, 
    value: f.value 
  }))}
  currentMetric={metric as string}
  initialGroupBy={initialGroupBy}
  
  // Domain configuration
  {...createDefaultGroupBySelectorConfig('traces')}
/>
```

#### Step 2.3: Remove Adapter Imports

```typescript
// Remove adapter imports
import { GroupBySelectorV2, createDefaultGroupBySelectorConfig } from './GroupBySelectorV2';

// Add utility imports if needed
import { getFiltersVariable, getMetricVariable, getTraceExplorationScene } from 'utils/utils';
```

### Phase 3: Optimization and Cleanup

#### Step 3.1: Custom Configuration

```typescript
// Add custom configurations as needed
const customConfig = {
  ...createDefaultGroupBySelectorConfig('traces'),
  searchConfig: {
    maxOptions: 500, // Optimize for your data size
  },
  layoutConfig: {
    additionalWidthPerItem: 50, // Adjust for your UI
  },
};

<GroupBySelectorV2
  // ... other props
  {...customConfig}
/>
```

#### Step 3.2: Performance Optimization

```typescript
// Memoize expensive computations
const memoizedOptions = useMemo(() => 
  getAttributesAsOptions(attributes), 
  [attributes]
);

const memoizedFilters = useMemo(() => 
  filters.map(f => ({ key: f.key, operator: f.operator, value: f.value })),
  [filters]
);

<GroupBySelectorV2
  options={memoizedOptions}
  filters={memoizedFilters}
  // ... other props
/>
```

## Validation and Testing

### Functional Testing

#### Test Checklist

- [ ] **Basic Rendering**: Component renders without errors
- [ ] **Radio Buttons**: Correct radio buttons appear
- [ ] **Dropdown Options**: All expected options in dropdown
- [ ] **Selection**: Selection changes work correctly
- [ ] **Filtering**: Active filters affect available options
- [ ] **Responsive**: Radio buttons hide/show based on width
- [ ] **Search**: Search functionality works in dropdown
- [ ] **Performance**: No performance regression with large datasets

#### Test Script Example

```typescript
describe('GroupBySelector Migration', () => {
  it('should maintain same behavior as legacy component', () => {
    const mockOnChange = jest.fn();
    const testOptions = [
      { label: 'Service', value: 'service.name' },
      { label: 'Operation', value: 'operation.name' },
    ];

    // Test adapter approach
    render(
      <GroupBySelectorV2
        {...createGroupBySelectorPropsWithAdapter({
          model: mockModel,
          options: testOptions,
          radioAttributes: ['service.name'],
          value: '',
          showAll: false,
        })}
      />
    );

    // Verify rendering
    expect(screen.getByText('Group by')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    
    // Test interaction
    fireEvent.click(screen.getByText('Service'));
    expect(mockOnChange).toHaveBeenCalledWith('service.name');
  });
});
```

### Performance Testing

```typescript
// Test with large datasets
const performanceTest = () => {
  const largeOptions = Array.from({ length: 1000 }, (_, i) => ({
    label: `Option ${i}`,
    value: `option_${i}`,
  }));

  const startTime = performance.now();
  
  render(
    <GroupBySelectorV2
      options={largeOptions}
      radioAttributes={largeOptions.slice(0, 10).map(o => o.value)}
      value=""
      onChange={() => {}}
      virtualizationConfig={{ enabled: true }}
      searchConfig={{ maxOptions: 100 }}
    />
  );
  
  const endTime = performance.now();
  console.log(`Render time: ${endTime - startTime}ms`);
  
  // Should render in reasonable time
  expect(endTime - startTime).toBeLessThan(100);
};
```

### Visual Regression Testing

```typescript
// Compare screenshots before/after migration
describe('Visual Regression', () => {
  it('should look identical to legacy component', async () => {
    // Render legacy component
    const legacyScreenshot = await page.screenshot();
    
    // Render new component
    const newScreenshot = await page.screenshot();
    
    // Compare (using your preferred visual testing tool)
    expect(newScreenshot).toMatchImageSnapshot(legacyScreenshot);
  });
});
```

## Migration Examples

### AttributesComparisonScene Migration

**Before:**
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

**After (Adapter):**
```typescript
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

**After (Direct):**
```typescript
// Extract state
const filtersVariable = getFiltersVariable(model);
const metricVariable = getMetricVariable(model);
const { initialGroupBy } = getTraceExplorationScene(model).useState();
const { filters } = filtersVariable.useState();
const { value: metric } = metricVariable.useState();

<GroupBySelectorV2
  options={getAttributesAsOptions(attributes)}
  radioAttributes={radioAttributesSpan}
  value={variable.getValueText()}
  onChange={model.onChange}
  showAll={true}
  filters={filters.map(f => ({ key: f.key, operator: f.operator, value: f.value }))}
  currentMetric={metric as string}
  initialGroupBy={initialGroupBy}
  {...createDefaultGroupBySelectorConfig('traces')}
/>
```

### AttributesBreakdownScene Migration

**Before:**
```typescript
<GroupBySelector
  options={getAttributesAsOptions(filteredAttributes!)}
  radioAttributes={scope === RESOURCE ? radioAttributesResource : radioAttributesSpan}
  value={groupBy}
  onChange={model.onChange}
  model={model}
/>
```

**After (Direct):**
```typescript
<GroupBySelectorV2
  {...createGroupBySelectorPropsWithAdapter({
    model,
    options: getAttributesAsOptions(filteredAttributes!),
    radioAttributes: scope === RESOURCE ? radioAttributesResource : radioAttributesSpan,
    value: groupBy,
  })}
/>
```

## Troubleshooting

### Common Issues

#### Issue: "Cannot find module GroupBySelectorV2"

**Solution:**
```typescript
// Ensure correct import path
import { GroupBySelectorV2 } from '../../../GroupBySelectorV2';
// or
import { GroupBySelectorV2 } from './GroupBySelectorV2';
```

#### Issue: TypeScript compilation errors

**Solution:**
```typescript
// Ensure all required props are provided
<GroupBySelectorV2
  options={options}           // Required
  radioAttributes={[]}        // Required  
  value={value}              // Optional but recommended
  onChange={handleChange}     // Required
  // ... other props
/>
```

#### Issue: Radio buttons not showing

**Solution:**
```typescript
// Debug: Check if radioAttributes exist in options
const debugRadioAttributes = radioAttributes.filter(attr =>
  options.some(opt => opt.value === attr)
);
console.log('Available radio attributes:', debugRadioAttributes);

// Ensure attributes exist in options
const validRadioAttributes = radioAttributes.filter(attr =>
  options.some(opt => opt.value === attr)
);
```

#### Issue: Filtering not working as expected

**Solution:**
```typescript
// Debug filtering rules
const filterContext = { filters, currentMetric, availableOptions: options };
console.log('Filter context:', filterContext);

// Check domain configuration
const config = createDefaultGroupBySelectorConfig('traces');
console.log('Domain config:', config.filteringRules);
```

### Performance Issues

#### Issue: Slow rendering with large datasets

**Solution:**
```typescript
<GroupBySelectorV2
  // ... other props
  searchConfig={{ maxOptions: 500 }}        // Limit options
  virtualizationConfig={{ enabled: true }}  // Enable virtualization
  layoutConfig={{ 
    enableResponsiveRadioButtons: true       // Enable responsive behavior
  }}
/>
```

#### Issue: Memory leaks

**Solution:**
```typescript
// Ensure proper cleanup in parent component
useEffect(() => {
  return () => {
    // Cleanup any subscriptions or timers
  };
}, []);

// Use memoization for expensive computations
const memoizedOptions = useMemo(() => 
  computeExpensiveOptions(data), 
  [data]
);
```

## Rollback Plan

### Quick Rollback (Emergency)

If issues are discovered after migration:

1. **Revert Import:**
   ```typescript
   // Change back to legacy import
   import { GroupBySelector } from './GroupBySelector';
   ```

2. **Revert Usage:**
   ```typescript
   // Change back to legacy usage
   <GroupBySelector
     options={options}
     radioAttributes={radioAttributes}
     value={value}
     onChange={onChange}
     showAll={showAll}
     model={model}
   />
   ```

3. **Test and Deploy:**
   ```bash
   npm run test
   npm run build
   # Deploy with rollback
   ```

### Gradual Rollback

For partial rollback of specific sites:

1. **Identify Problem Sites:**
   ```bash
   # Find files with new component
   grep -r "GroupBySelectorV2" src/ --include="*.tsx"
   ```

2. **Rollback Specific Files:**
   ```typescript
   // Rollback just the problematic usage
   // Keep working migrations intact
   ```

3. **Validate and Monitor:**
   ```bash
   # Run tests for rolled back components
   npm test -- --testPathPattern="AttributesComparisonScene"
   ```

## Migration Checklist

### Pre-Migration
- [ ] Backup current code
- [ ] Run full test suite
- [ ] Document current behavior
- [ ] Set up monitoring/logging

### During Migration
- [ ] Update imports
- [ ] Replace component usage
- [ ] Test each change
- [ ] Monitor performance
- [ ] Document any issues

### Post-Migration
- [ ] Run full test suite
- [ ] Performance testing
- [ ] Visual regression testing
- [ ] Monitor production metrics
- [ ] Update documentation
- [ ] Plan legacy cleanup

### Cleanup Phase
- [ ] Remove adapter imports
- [ ] Remove legacy component files
- [ ] Update documentation
- [ ] Remove feature flags
- [ ] Final performance validation

## Success Criteria

Migration is considered successful when:

- [ ] All functionality preserved
- [ ] No performance regression
- [ ] All tests passing
- [ ] Visual appearance unchanged
- [ ] No production errors
- [ ] Team approval and sign-off

## Timeline Template

| Week | Phase | Activities | Success Criteria |
|------|-------|------------|------------------|
| 1 | Preparation | Setup, analysis, planning | Environment ready, sites identified |
| 2 | Adapter Migration | Update all sites with adapter | All sites using GroupBySelectorV2 |
| 3 | Testing | Comprehensive testing | All tests passing, no regressions |
| 4 | Direct Migration | Convert critical paths | Key components optimized |
| 5 | Optimization | Performance tuning | Performance targets met |
| 6 | Cleanup | Remove legacy code | Clean codebase, documentation updated |

## Support and Resources

- **API Documentation**: See `API_DOCUMENTATION.md`
- **Examples**: See `domain-examples.tsx`
- **Tests**: See test files for usage patterns
- **TypeScript Definitions**: Check `.d.ts` files for type information

For additional support:
1. Check existing documentation
2. Review test files for examples
3. Consult with the development team
4. Create issue tickets for bugs or questions
