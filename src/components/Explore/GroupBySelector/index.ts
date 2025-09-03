export { GroupBySelector } from './GroupBySelector';
export type {
  GroupBySelectorProps,
  FilterConfig,
  AttributePrefixConfig,
  FilterContext,
  FilteringRulesConfig,
  LayoutConfig,
  SearchConfig,
  VirtualizationConfig,
  ProcessedAttribute,
  DomainConfig,
  DomainType,
} from './types';
export {
  createAttributeFilter,
  processRadioAttributes,
  removeAttributePrefixes,
  filteredOptions,
  getModifiedSelectOptions,
  createDefaultGroupBySelectorConfig,
  mergeConfigurations,
} from './utils';
export {
  createGroupBySelectorAdapter,
  createGroupBySelectorPropsWithAdapter,
  isLegacyModel,
  isAttributesBreakdownScene,
  isAttributesComparisonScene,
} from './adapter';
export type {
  LegacyModel,
  GroupBySelectorAdapterProps,
} from './adapter';
