import { css } from '@emotion/css';
import { useResizeObserver } from '@react-aria/utils';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Select, RadioButtonGroup, useStyles2, useTheme2, measureText, Field, InputActionMeta, Tooltip, Icon } from '@grafana/ui';
import { usePluginUserStorage } from '@grafana/runtime';
import { ALL, GROUP_BY_CLICK_COUNTS_STORAGE_KEY, ignoredAttributes, maxOptions, MetricFunction, RESOURCE_ATTR, SPAN_ATTR } from 'utils/shared';
import { AttributesBreakdownScene } from './TracesByService/Tabs/Breakdown/AttributesBreakdownScene';
import { AttributesComparisonScene } from './TracesByService/Tabs/Comparison/AttributesComparisonScene';
import { getFiltersVariable, getMetricVariable } from 'utils/utils';

type Props = {
  options: Array<SelectableValue<string>>;
  radioAttributes: string[];
  value?: string;
  onChange: (label: string, ignore?: boolean) => void;
  showAll?: boolean;
  model: AttributesBreakdownScene | AttributesComparisonScene;
};

const additionalWidthPerItem = 40;
const widthOfOtherAttributes = 180;

export function GroupBySelector({ options, radioAttributes, value, onChange, showAll = false, model }: Props) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  const { fontSize } = theme.typography;
  const storage = usePluginUserStorage();

  const [selectQuery, setSelectQuery] = useState<string>('');
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});

  const [availableWidth, setAvailableWidth] = useState<number>(0);
  const controlsContainer = useRef<HTMLDivElement>(null);

  const { filters } = getFiltersVariable(model).useState();
  const { value: metric } = getMetricVariable(model).useState();
  const metricValue = metric as MetricFunction;

  useEffect(() => {
    const loadClickCounts = async () => {
      try {
        const storedCounts = await storage.getItem(GROUP_BY_CLICK_COUNTS_STORAGE_KEY);
        if (storedCounts) {
          const counts = JSON.parse(storedCounts);
          setClickCounts(counts);
        }
      } catch (e) {
        console.error('Failed to load group by click counts:', e);
      }
    };
    
    loadClickCounts();
  }, []);

  const trackOptionClick = async (option: string) => {
    try {
      const updatedCounts = { ...clickCounts };
      updatedCounts[option] = (updatedCounts[option] || 0) + 1;
      setClickCounts(updatedCounts);
      await storage.setItem(GROUP_BY_CLICK_COUNTS_STORAGE_KEY, JSON.stringify(updatedCounts));
    } catch (e) {
      console.error('Failed to update group by click counts:', e);
    }
  };

  const onOptionChanged = (option: string) => {
    trackOptionClick(option);
    onChange(option);
  };

  useResizeObserver({
    ref: controlsContainer,
    onResize: () => {
      const element = controlsContainer.current;
      if (element) {
        setAvailableWidth(element.clientWidth);
      }
    },
  });

  const filterValidOptions = useMemo(() => {
    const isOptionValid = (option: string) => {
      // Check if option exists in dropdown
      let isValid = !!options.find((o) => o.value === option);

      // Remove options that are in the filters
      if (filters.find((f) => f.key === option && (f.operator === '=' || f.operator === '!='))) {
        return false;
      }

      // If filters (primary signal) has 'Full Traces' selected, then don't add rootName or rootServiceName to options
      if (filters.find((f) => f.key === 'nestedSetParent')) {
        isValid = isValid && option !== 'rootName' && option !== 'rootServiceName';
      }

      // If rate or error rate metric is selected, then don't add status to options
      if (metricValue === 'rate' || metricValue === 'errors') {
        isValid = isValid && option !== 'status';
      }

      // Filter out ignored attributes
      isValid = isValid && !ignoredAttributes.includes(option);

      return isValid;
    };

    const allOptionValues = options.map(op => op.value?.toString() ?? '');
    
    const validRadioOptions = radioAttributes.filter(isOptionValid);
    
    // Get valid other options (not in radio attributes, but valid and have been clicked)
    const validOtherOptions = allOptionValues
      .filter(option => 
        isOptionValid(option) && 
        !radioAttributes.includes(option) && 
        (clickCounts[option] || 0) > 0
      );

    const allOptions = [...validRadioOptions, ...validOtherOptions];

    return {
      allOptions,
      isOptionValid
    };
  }, [options, radioAttributes, filters, metricValue, clickCounts]);

  const radioOptions = useMemo(() => {
    let radioOptionsWidth = 0;
    const { allOptions } = filterValidOptions;
    
    return allOptions
      .map((attribute) => ({
        label: attribute.replace(SPAN_ATTR, '').replace(RESOURCE_ATTR, ''),
        text: attribute,
        value: attribute,
        clickCount: clickCounts[attribute] || 0
      }))
      .sort((a, b) => b.clickCount - a.clickCount)
      .filter((option) => {
        const text = option.label || option.text || '';
        const textWidth = measureText(text, fontSize).width;
        if (radioOptionsWidth + textWidth + additionalWidthPerItem + widthOfOtherAttributes < availableWidth) {
          radioOptionsWidth += textWidth + additionalWidthPerItem;
          return true;
        } else {
          return false;
        }
      });
  }, [filterValidOptions, fontSize, availableWidth, clickCounts]);

  // Get all options that are not in the radio group
  const otherAttrOptions = useMemo(() => {
    const radioOptionValues = radioOptions.map(opt => opt.value);
    const ops = options.filter(op => {
      const optionValue = op.value?.toString() ?? '';
      return !radioOptionValues.includes(optionValue) && filterValidOptions.isOptionValid(optionValue);
    });
    
    return filteredOptions(ops, selectQuery);
  }, [selectQuery, options, radioOptions, filterValidOptions]);

  const getModifiedSelectOptions = useMemo(() => {
    return (options: Array<SelectableValue<string>>) => {
      const processedOptions = options
        .map((op) => ({ 
          label: op.label?.replace(SPAN_ATTR, '').replace(RESOURCE_ATTR, ''), 
          value: op.value 
        }));
      
      const frequentlyUsed: Array<SelectableValue<string>> = [];
      const other: Array<SelectableValue<string>> = [];
      
      // Track processed option values to avoid duplicates within the groups
      const radioOptionValues = radioOptions.map(opt => opt.value);
      const processedValues = new Set<string>();
      
      processedOptions.forEach(option => {
        const optionValue = option.value?.toString() ?? '';
        
        // Skip if we've already processed this value or if it's in the radio buttons
        if (processedValues.has(optionValue) || radioOptionValues.includes(optionValue)) {
          return;
        }
        
        processedValues.add(optionValue);
        const clickCount = clickCounts[optionValue] || 0;
        clickCount > 0 ? frequentlyUsed.push(option) : other.push(option);
      });
      
      frequentlyUsed.sort((a, b) => {
        const aClicks = clickCounts[a.value?.toString() ?? ''] || 0;
        const bClicks = clickCounts[b.value?.toString() ?? ''] || 0;
        return bClicks - aClicks;
      });
      
      const result: Array<SelectableValue<string>> = [];
      
      if (frequentlyUsed.length > 0) {
        result.push({
          label: 'Frequently Used',
          options: frequentlyUsed,
        });
      }
      
      if (other.length > 0) {
        result.push({
          label: 'Other',
          options: other,
        });
      }
      
      return result;
    };
  }, [radioOptions, clickCounts]);

  // Set default value as first value in options
  useEffect(() => {
    const defaultValue = radioAttributes[0] ?? options[0]?.value;
    if (defaultValue) {
      if (!showAll && (!value || value === ALL)) {
        onChange(defaultValue, true);
      }
    }
  }, [radioAttributes, options, value, showAll, onChange]);

  const showAllOption = showAll ? [{ label: ALL, value: ALL }] : [];
  const defaultOnChangeValue = showAll ? ALL : '';

  const tooltipContent = (
    <div className={styles.tooltip}>
      <p>Attributes are ordered by frequency of use. Most frequently used attributes appear first in the radio buttons and dropdown menu.</p>
      <p>Traces Drilldown tracks your selections and automatically prioritizes the attributes you use most often.</p>
    </div>
  );

  return (
    <Field 
      label={
        <div className={styles.labelWithTooltip}>
          Group by
          <Tooltip content={tooltipContent} placement="right" theme="info">
            <Icon name="info-circle" className={styles.infoIcon} />
          </Tooltip>
        </div>
      }
    >
      <div ref={controlsContainer} className={styles.container}>
        {radioOptions.length > 0 && (
          <RadioButtonGroup 
            options={[...showAllOption, ...radioOptions]} 
            value={value} 
            onChange={onOptionChanged} 
          />
        )}
        <Select
          value={value && otherAttrOptions.some(op => op.value === value) ? value : null} // remove value from select when radio button clicked
          placeholder={'Other attributes'}
          options={getModifiedSelectOptions(otherAttrOptions)}
          onChange={(selected) => {
            const newSelected = selected?.value ?? defaultOnChangeValue;
            onOptionChanged(newSelected);
          }}
          className={styles.select}
          isClearable
          onInputChange={(value: string, { action }: InputActionMeta) => {
            if (action === 'input-change') {
              setSelectQuery(value);
            }
          }}
          onCloseMenu={() => setSelectQuery('')}
          virtualized
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
    labelWithTooltip: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    }),
    infoIcon: css({
      cursor: 'pointer',
    }),
    tooltip: css({
      maxWidth: '300px',
      p: {
        margin: theme.spacing(0, 0, 1, 0),
        '&:last-child': {
          marginBottom: 0,
        },
      },
    }),
  };
}

export const filteredOptions = (options: Array<SelectableValue<string>>, query: string) => {
  if (options.length === 0) {
    return [];
  }

  if (query.length === 0) {
    return options.slice(0, maxOptions);
  }

  const queryLowerCase = query.toLowerCase();
  return options
    .filter((tag) => {
      if (tag.value && tag.value.length > 0) {
        return tag.value.toLowerCase().includes(queryLowerCase);
      }
      return false;
    })
    .slice(0, maxOptions);
};
