import { SelectableValue } from '@grafana/data';
import { measureText } from '@grafana/ui';
import {
  FilterConfig,
  FilterContext,
  FilteringRulesConfig,
  ProcessedAttribute,
  AttributePrefixConfig,
  SearchConfig,
  DomainConfig,
  DomainType,
} from './types';

/**
 * Creates an attribute filter function based on the provided rules and context
 */
export const createAttributeFilter = (
  rules: FilteringRulesConfig,
  context: FilterContext
) => (attribute: string): boolean => {
  // Apply custom filter if provided
  if (rules.customAttributeFilter) {
    return rules.customAttributeFilter(attribute, context);
  }

  // Check if attribute is in active filters and should be excluded from radio buttons
  if (rules.excludeFilteredFromRadio) {
    const hasEqualOrNotEqualFilter = context.filters.some(
      (f) => f.key === attribute && (f.operator === '=' || f.operator === '!=')
    );
    if (hasEqualOrNotEqualFilter) {
      return false;
    }
  }

  // Check metric-based exclusions
  if (rules.excludeAttributesForMetrics && context.currentMetric) {
    const excludedForMetric = rules.excludeAttributesForMetrics[context.currentMetric] || [];
    if (excludedForMetric.includes(attribute)) {
      return false;
    }
  }

  // Check filter-based exclusions
  if (rules.excludeAttributesForFilters) {
    for (const filter of context.filters) {
      const excludedForFilter = rules.excludeAttributesForFilters[filter.key] || [];
      if (excludedForFilter.includes(attribute)) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Processes radio attributes based on available options, filters, and rules
 */
export const processRadioAttributes = (
  radioAttributes: string[],
  options: Array<SelectableValue<string>>,
  filters: FilterConfig[],
  rules: FilteringRulesConfig,
  context: FilterContext,
  attributePrefixes: AttributePrefixConfig,
  fontSize: number,
  availableWidth: number,
  additionalWidthPerItem: number,
  widthOfOtherAttributes: number
): ProcessedAttribute[] => {
  const attributeFilter = createAttributeFilter(rules, context);
  let radioOptionsWidth = 0;

  return radioAttributes
    .filter((attribute) => {
      // Check if attribute exists in options
      const existsInOptions = options.some((option) => option.value === attribute);
      if (!existsInOptions) {
        return false;
      }

      // Apply filtering rules
      return attributeFilter(attribute);
    })
    .map((attribute) => ({
      label: removeAttributePrefixes(attribute, attributePrefixes),
      text: attribute,
      value: attribute,
    }))
    .filter((option) => {
      // Calculate width and filter based on available space
      const text = option.label || option.text || '';
      const textWidth = measureText(text, fontSize).width;

      if (radioOptionsWidth + textWidth + additionalWidthPerItem + widthOfOtherAttributes < availableWidth) {
        radioOptionsWidth += textWidth + additionalWidthPerItem;
        return true;
      }

      return false;
    });
};

/**
 * Removes attribute prefixes from labels for display
 */
export const removeAttributePrefixes = (
  attribute: string,
  prefixes: AttributePrefixConfig
): string => {
  for (const [, prefix] of Object.entries(prefixes)) {
    if (prefix && attribute.startsWith(prefix)) {
      return attribute.replace(prefix, '');
    }
  }
  return attribute;
};

/**
 * Filters options based on search query
 */
export const filteredOptions = (
  options: Array<SelectableValue<string>>,
  query: string,
  searchConfig: SearchConfig
): Array<SelectableValue<string>> => {
  if (options.length === 0) {
    return [];
  }

  if (query.length === 0) {
    return options.slice(0, searchConfig.maxOptions || 1000);
  }

  const searchQuery = searchConfig.caseSensitive ? query : query.toLowerCase();
  const searchFields = searchConfig.searchFields || ['label', 'value'];

  return options
    .filter((option) => {
      return searchFields.some((field) => {
        const fieldValue = option[field];
        if (fieldValue && fieldValue.length > 0) {
          const searchText = searchConfig.caseSensitive
            ? fieldValue.toString()
            : fieldValue.toString().toLowerCase();
          return searchText.includes(searchQuery);
        }
        return false;
      });
    })
    .slice(0, searchConfig.maxOptions || 1000);
};

/**
 * Processes select options by removing ignored attributes and applying prefixes
 */
export const getModifiedSelectOptions = (
  options: Array<SelectableValue<string>>,
  ignoredAttributes: string[],
  attributePrefixes: AttributePrefixConfig
): Array<SelectableValue<string>> => {
  return options
    .filter((option) => !ignoredAttributes.includes(option.value?.toString() || ''))
    .map((option) => ({
      label: option.label
        ? removeAttributePrefixes(option.label, attributePrefixes)
        : undefined,
      value: option.value,
    }));
};

/**
 * Creates default configuration for different domains
 */
export const createDefaultGroupBySelectorConfig = (domain: DomainType): Partial<DomainConfig> => {
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
          'duration',
          'event:name',
          'nestedSetLeft',
          'nestedSetParent',
          'nestedSetRight',
          'span:duration',
          'span:id',
          'trace:duration',
          'trace:id',
          'traceDuration',
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

    case 'logs':
      return {
        attributePrefixes: {
          log: 'log.',
          resource: 'resource.',
        },
        filteringRules: {
          excludeFilteredFromRadio: true,
        },
        ignoredAttributes: ['timestamp', 'log:id'],
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

    case 'metrics':
      return {
        attributePrefixes: {
          metric: 'metric.',
          resource: 'resource.',
        },
        filteringRules: {
          excludeFilteredFromRadio: true,
        },
        ignoredAttributes: ['__name__', 'timestamp'],
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

    case 'custom':
    default:
      return {
        attributePrefixes: {},
        filteringRules: {},
        ignoredAttributes: [],
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
  }
};

/**
 * Merges user configuration with domain defaults
 */
export const mergeConfigurations = (
  domainConfig: Partial<DomainConfig>,
  userConfig: Partial<DomainConfig>
): DomainConfig => {
  return {
    attributePrefixes: { ...domainConfig.attributePrefixes, ...userConfig.attributePrefixes },
    filteringRules: { ...domainConfig.filteringRules, ...userConfig.filteringRules },
    ignoredAttributes: userConfig.ignoredAttributes || domainConfig.ignoredAttributes || [],
    layoutConfig: { ...domainConfig.layoutConfig, ...userConfig.layoutConfig },
    searchConfig: { ...domainConfig.searchConfig, ...userConfig.searchConfig },
    virtualizationConfig: { ...domainConfig.virtualizationConfig, ...userConfig.virtualizationConfig },
  } as DomainConfig;
};
