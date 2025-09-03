import { css } from '@emotion/css';
import { useResizeObserver } from '@react-aria/utils';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Combobox, RadioButtonGroup, useStyles2, useTheme2, Field } from '@grafana/ui';

import {
  GroupBySelectorProps,
  FilterContext,
  DomainConfig,
} from './types';
import {
  processRadioAttributes,
  filteredOptions,
  getModifiedSelectOptions,
  createDefaultGroupBySelectorConfig,
  mergeConfigurations,
} from './utils';

const DEFAULT_ADDITIONAL_WIDTH_PER_ITEM = 40;
const DEFAULT_WIDTH_OF_OTHER_ATTRIBUTES = 180;
const DEFAULT_ALL_OPTION = 'All';

export function GroupBySelector({
  // Core props
  options,
  radioAttributes,
  value,
  onChange,
  showAll = false,

  // State data
  filters = [],
  currentMetric,
  initialGroupBy,

  // Display configuration
  attributePrefixes = {},
  fieldLabel = 'Group by',
  selectPlaceholder = 'Other attributes',

  // Filtering rules
  filteringRules = {},
  ignoredAttributes = [],

  // Layout and sizing
  layoutConfig = {},

  // Advanced options
  searchConfig = {},
  virtualizationConfig = {},
}: GroupBySelectorProps) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const { fontSize } = theme.typography;

  // Internal state
  const [allowAutoUpdate, setAllowAutoUpdate] = useState<boolean>(true);
  const [availableWidth, setAvailableWidth] = useState<number>(0);
  const controlsContainer = useRef<HTMLDivElement>(null);

  // Merge configurations with defaults
  const domainDefaults = createDefaultGroupBySelectorConfig('traces');
  const config: DomainConfig = useMemo(() =>
    mergeConfigurations(domainDefaults, {
      attributePrefixes,
      filteringRules,
      ignoredAttributes,
      layoutConfig,
      searchConfig,
      virtualizationConfig,
    }),
    [attributePrefixes, filteringRules, ignoredAttributes, layoutConfig, searchConfig, virtualizationConfig, domainDefaults]
  );

  // Resize observer for responsive radio buttons
  useResizeObserver({
    ref: controlsContainer,
    onResize: () => {
      const element = controlsContainer.current;
      if (element && config.layoutConfig.enableResponsiveRadioButtons) {
        setAvailableWidth(element.clientWidth);
      }
    },
  });

  // Create filter context
  const filterContext: FilterContext = useMemo(() => ({
    filters,
    currentMetric,
    availableOptions: options,
  }), [filters, currentMetric, options]);

  // Process radio attributes
  const radioOptions = useMemo(() => {
    if (!config.layoutConfig.enableResponsiveRadioButtons) {
      return radioAttributes.map((attribute) => ({
        label: config.attributePrefixes.span?.length
          ? attribute.replace(config.attributePrefixes.span, '')
          : attribute.replace(config.attributePrefixes.resource || '', ''),
        text: attribute,
        value: attribute,
      }));
    }

    return processRadioAttributes(
      radioAttributes,
      options,
      filters,
      config.filteringRules,
      filterContext,
      config.attributePrefixes,
      fontSize,
      availableWidth,
      config.layoutConfig.additionalWidthPerItem || DEFAULT_ADDITIONAL_WIDTH_PER_ITEM,
      config.layoutConfig.widthOfOtherAttributes || DEFAULT_WIDTH_OF_OTHER_ATTRIBUTES
    );
  }, [
    radioAttributes,
    options,
    filters,
    config.filteringRules,
    config.attributePrefixes,
    filterContext,
    fontSize,
    availableWidth,
    config.layoutConfig.additionalWidthPerItem,
    config.layoutConfig.widthOfOtherAttributes,
    config.layoutConfig.enableResponsiveRadioButtons,
  ]);

  // Process other attributes (those not in radio buttons)
  const otherAttrOptions = useMemo(() => {
    const optionsNotInRadio = options.filter(
      (option) => !radioOptions.find((ro) => ro.value === option.value?.toString())
    );
    return filteredOptions(optionsNotInRadio, '', config.searchConfig);
  }, [options, radioOptions, config.searchConfig]);

  // Get modified select options
  const modifiedSelectOptions = useMemo(() =>
    getModifiedSelectOptions(otherAttrOptions, config.ignoredAttributes, config.attributePrefixes),
    [otherAttrOptions, config.ignoredAttributes, config.attributePrefixes]
  );

  // Determine default value
  const defaultValue = initialGroupBy ?? radioOptions[0]?.value ?? modifiedSelectOptions[0]?.value;

  // Auto-update logic
  useEffect(() => {
    if (defaultValue && !showAll && allowAutoUpdate) {
      onChange(defaultValue, true);
      setAllowAutoUpdate(false);
    }
  }, [value, defaultValue, showAll, onChange, allowAutoUpdate]);

  useEffect(() => {
    if (radioAttributes.length > 0) {
      setAllowAutoUpdate(true);
    }
  }, [radioAttributes]);

  useEffect(() => {
    if (filters.some((f) => f.key === value)) {
      setAllowAutoUpdate(true);
    }
  }, [filters, value]);

  // Show All option
  const showAllOption = showAll ? [{ label: DEFAULT_ALL_OPTION, value: DEFAULT_ALL_OPTION }] : [];
  const defaultOnChangeValue = showAll ? DEFAULT_ALL_OPTION : '';

  return (
    <Field label={fieldLabel}>
      <div ref={controlsContainer} className={styles.container}>
        {radioOptions.length > 0 && (
          <RadioButtonGroup
            options={[...showAllOption, ...radioOptions]}
            value={value}
            onChange={onChange}
          />
        )}
        <Combobox
          value={value && modifiedSelectOptions.some((x) => x.value === value) ? value : null}
          placeholder={selectPlaceholder}
          options={modifiedSelectOptions.filter(opt => opt.value !== undefined) as Array<{label?: string, value: string}>}
          onChange={(selected) => {
            const newSelected = (selected?.value as string) ?? defaultOnChangeValue;
            onChange(newSelected);
          }}
          isClearable
        />
      </div>
    </Field>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    select: css({
      maxWidth: theme.spacing(22),
    }),
    container: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
  };
}
