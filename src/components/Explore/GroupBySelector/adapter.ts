import { SceneObject } from '@grafana/scenes';
import { AttributesBreakdownScene } from '../TracesByService/Tabs/Breakdown/AttributesBreakdownScene';
import { AttributesComparisonScene } from '../TracesByService/Tabs/Comparison/AttributesComparisonScene';
import { getFiltersVariable, getMetricVariable, getTraceExplorationScene } from '../../../utils/utils';
import { GroupBySelectorProps, createDefaultGroupBySelectorConfig } from './';

/**
 * Legacy model type for backward compatibility
 */
export type LegacyModel = AttributesBreakdownScene | AttributesComparisonScene;

/**
 * Creates adapter configuration for GroupBySelector from legacy scene models
 * This allows gradual migration from the old component to the new one
 */
export const createGroupBySelectorAdapter = (
  model: LegacyModel
): Partial<GroupBySelectorProps> => {
  try {
    // Extract state from scene graph
    const traceExploration = getTraceExplorationScene(model);
    const filtersVariable = getFiltersVariable(model);
    const metricVariable = getMetricVariable(model);

    // Get state values
    const { initialGroupBy } = traceExploration.useState();
    const { filters } = filtersVariable.useState();
    const { value: metric } = metricVariable.useState();

    // Convert filters to the new format
    const convertedFilters = filters.map((filter) => ({
      key: filter.key,
      operator: filter.operator,
      value: filter.value,
    }));

    // Get traces domain defaults
    const tracesDefaults = createDefaultGroupBySelectorConfig('traces');

    return {
      filters: convertedFilters,
      currentMetric: metric as string,
      initialGroupBy,
      ...tracesDefaults,
    };
  } catch (error) {
    console.warn('Failed to create GroupBySelector adapter configuration:', error);

    // Return safe defaults if extraction fails
    const tracesDefaults = createDefaultGroupBySelectorConfig('traces');
    return {
      filters: [],
      ...tracesDefaults,
    };
  }
};

/**
 * Enhanced adapter that also handles the model's onChange method
 */
export interface GroupBySelectorAdapterProps {
  model: LegacyModel;
  options: GroupBySelectorProps['options'];
  radioAttributes: GroupBySelectorProps['radioAttributes'];
  value?: GroupBySelectorProps['value'];
  showAll?: GroupBySelectorProps['showAll'];

  // Allow overriding any adapter configuration
  overrides?: Partial<GroupBySelectorProps>;
}

/**
 * Creates complete props for GroupBySelector using the adapter
 */
export const createGroupBySelectorPropsWithAdapter = ({
  model,
  options,
  radioAttributes,
  value,
  showAll = false,
  overrides = {},
}: GroupBySelectorAdapterProps): GroupBySelectorProps => {
  const adapterConfig = createGroupBySelectorAdapter(model);

  return {
    // Core props passed through
    options,
    radioAttributes,
    value,
    onChange: model.onChange.bind(model),
    showAll,

    // Adapter configuration
    ...adapterConfig,

    // User overrides
    ...overrides,
  };
};

/**
 * Utility to check if a scene object is a supported legacy model
 */
export const isLegacyModel = (model: SceneObject): model is LegacyModel => {
  return model instanceof AttributesBreakdownScene || model instanceof AttributesComparisonScene;
};

/**
 * Type guard for AttributesBreakdownScene
 */
export const isAttributesBreakdownScene = (model: SceneObject): model is AttributesBreakdownScene => {
  return model instanceof AttributesBreakdownScene;
};

/**
 * Type guard for AttributesComparisonScene
 */
export const isAttributesComparisonScene = (model: SceneObject): model is AttributesComparisonScene => {
  return model instanceof AttributesComparisonScene;
};
