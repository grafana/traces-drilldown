import { SelectableValue } from '@grafana/data';

/**
 * Configuration for a single filter
 */
export interface FilterConfig {
  key: string;
  operator: string;
  value: string;
}

/**
 * Configuration for attribute prefixes used in label display
 */
export interface AttributePrefixConfig {
  span?: string;
  resource?: string;
  event?: string;
  [key: string]: string | undefined;
}

/**
 * Context provided to filtering functions
 */
export interface FilterContext {
  filters: FilterConfig[];
  currentMetric?: string;
  availableOptions: Array<SelectableValue<string>>;
}

/**
 * Configuration for attribute filtering rules
 */
export interface FilteringRulesConfig {
  /** Exclude attributes from radio buttons when they're in active filters */
  excludeFilteredFromRadio?: boolean;

  /** Exclude specific attributes when certain metrics are selected */
  excludeAttributesForMetrics?: Record<string, string[]>;

  /** Exclude specific attributes when certain filters are active */
  excludeAttributesForFilters?: Record<string, string[]>;

  /** Custom filtering function for advanced use cases */
  customAttributeFilter?: (attribute: string, context: FilterContext) => boolean;
}

/**
 * Configuration for layout and sizing
 */
export interface LayoutConfig {
  /** Additional width per radio button item */
  additionalWidthPerItem?: number;

  /** Width reserved for the select dropdown */
  widthOfOtherAttributes?: number;

  /** Maximum width for the select component */
  maxSelectWidth?: number;

  /** Enable responsive radio button visibility based on available width */
  enableResponsiveRadioButtons?: boolean;
}

/**
 * Configuration for search functionality
 */
export interface SearchConfig {
  /** Enable search functionality in the select dropdown */
  enabled?: boolean;

  /** Maximum number of options to display */
  maxOptions?: number;

  /** Case sensitive search */
  caseSensitive?: boolean;

  /** Fields to search in */
  searchFields?: Array<'label' | 'value'>;
}

/**
 * Configuration for virtualization
 */
export interface VirtualizationConfig {
  /** Enable virtualization for large option lists */
  enabled?: boolean;

  /** Height of each item in pixels */
  itemHeight?: number;

  /** Maximum height of the dropdown */
  maxHeight?: number;
}

/**
 * Processed attribute with display information
 */
export interface ProcessedAttribute {
  label: string;
  text: string;
  value: string;
}

/**
 * Main props interface for GroupBySelector
 */
export interface GroupBySelectorProps {
  // Core Selection Interface
  /** Available attribute options for selection */
  options: Array<SelectableValue<string>>;

  /** Attributes to show as radio buttons */
  radioAttributes: string[];

  /** Currently selected attribute */
  value?: string;

  /** Selection change handler */
  onChange: (label: string, ignore?: boolean) => void;

  /** Whether to show "All" option */
  showAll?: boolean;

  // State Data (previously from scene graph)
  /** Active filters for exclusion logic */
  filters?: FilterConfig[];

  /** Current metric for conditional filtering */
  currentMetric?: string;

  /** Initial selection value */
  initialGroupBy?: string;

  // Display Configuration
  /** Attribute prefix configuration for label display */
  attributePrefixes?: AttributePrefixConfig;

  /** Field label text */
  fieldLabel?: string;

  /** Select placeholder text */
  selectPlaceholder?: string;

  // Filtering Rules Configuration
  /** Attribute filtering rules */
  filteringRules?: FilteringRulesConfig;

  /** Attributes to exclude from options */
  ignoredAttributes?: string[];

  // Layout and Sizing
  /** Layout and sizing configuration */
  layoutConfig?: LayoutConfig;

  // Advanced Options
  /** Search functionality configuration */
  searchConfig?: SearchConfig;

  /** Virtualization settings */
  virtualizationConfig?: VirtualizationConfig;
}

/**
 * Domain-specific configuration type
 */
export type DomainType = 'traces' | 'logs' | 'metrics' | 'custom';

/**
 * Default configuration for different domains
 */
export interface DomainConfig {
  attributePrefixes: AttributePrefixConfig;
  filteringRules: FilteringRulesConfig;
  ignoredAttributes: string[];
  layoutConfig: LayoutConfig;
  searchConfig: SearchConfig;
  virtualizationConfig: VirtualizationConfig;
}
