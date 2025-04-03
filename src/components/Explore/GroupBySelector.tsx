import { css } from '@emotion/css';
import { useResizeObserver } from '@react-aria/utils';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Select, RadioButtonGroup, useStyles2, useTheme2, measureText, Field, InputActionMeta } from '@grafana/ui';
import { ALL, ignoredAttributes, maxOptions, MetricFunction, RESOURCE_ATTR, SPAN_ATTR } from 'utils/shared';
import { AttributesBreakdownScene } from './TracesByService/Tabs/Breakdown/AttributesBreakdownScene';
import { AttributesComparisonScene } from './TracesByService/Tabs/Comparison/AttributesComparisonScene';
import { getFiltersVariable, getMetricVariable, getTraceExplorationScene } from 'utils/utils';

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

  const [selectQuery, setSelectQuery] = useState<string>('');
  const [allowAutoUpdate, setAllowAutoUpdate] = useState<boolean>(true);

  const [availableWidth, setAvailableWidth] = useState<number>(0);
  const controlsContainer = useRef<HTMLDivElement>(null);

  const { initialGroupBy } = getTraceExplorationScene(model).useState();
  const { filters } = getFiltersVariable(model).useState();
  const { value: metric } = getMetricVariable(model).useState();
  const metricValue = metric as MetricFunction;

  useResizeObserver({
    ref: controlsContainer,
    onResize: () => {
      const element = controlsContainer.current;
      if (element) {
        setAvailableWidth(element.clientWidth);
      }
    },
  });

  const radioOptions = useMemo(() => {
    let radioOptionsWidth = 0;
    return radioAttributes
      .filter((op) => {
        // remove radio options that are in the dropdown
        let checks = !!options.find((o) => o.value === op);

        // remove radio options that are in the filters
        if (filters.find((f) => f.key === op && (f.operator === '=' || f.operator === '!='))) {
          return false;
        }

        // if filters (primary signal) has 'Full Traces' selected, then don't add rootName or rootServiceName to options
        // as you would overwrite it in the query if it's selected
        if (filters.find((f) => f.key === 'nestedSetParent')) {
          checks = checks && op !== 'rootName' && op !== 'rootServiceName';
        }

        // if rate or error rate metric is selected, then don't add status to options
        // as you would overwrite it in the query if it's selected
        if (metricValue === 'rate' || metricValue === 'errors') {
          checks = checks && op !== 'status';
        }

        return checks;
      })
      .map((attribute) => ({
        label: attribute.replace(SPAN_ATTR, '').replace(RESOURCE_ATTR, ''),
        text: attribute,
        value: attribute,
      }))
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
  }, [radioAttributes, options, filters, metricValue, fontSize, availableWidth]);

  const otherAttrOptions = useMemo(() => {
    const ops = options.filter((op) => !radioOptions.find((ro) => ro.value === op.value?.toString()));
    return filteredOptions(ops, selectQuery);
  }, [selectQuery, options, radioOptions]);

  const getModifiedSelectOptions = (options: Array<SelectableValue<string>>) => {
    return options
      .filter((op) => !ignoredAttributes.includes(op.value?.toString()!))
      .map((op) => ({ label: op.label?.replace(SPAN_ATTR, '').replace(RESOURCE_ATTR, ''), value: op.value }));
  };

  const defaultValue = initialGroupBy ?? radioOptions[0]?.value ?? otherAttrOptions[0]?.value;

  // Set default value as first value in options
  useEffect(() => {
    if (defaultValue && !showAll && allowAutoUpdate) {
      onChange(defaultValue, true);
      setAllowAutoUpdate(false);
    }
  }, [value, defaultValue, showAll, onChange, allowAutoUpdate]);

  useEffect(() => {
    if (radioOptions.length > 0) {
      setAllowAutoUpdate(true);
    }
  }, [radioOptions.map((o) => o.label)]);

  const showAllOption = showAll ? [{ label: ALL, value: ALL }] : [];
  const defaultOnChangeValue = showAll ? ALL : '';

  return (
    <Field label="Group by">
      <div ref={controlsContainer} className={styles.container}>
        {radioOptions.length > 0 && (
          <RadioButtonGroup options={[...showAllOption, ...radioOptions]} value={value} onChange={onChange} />
        )}
        <Select
          value={value && getModifiedSelectOptions(otherAttrOptions).some((x) => x.value === value) ? value : null} // remove value from select when radio button clicked
          placeholder={'Other attributes'}
          options={getModifiedSelectOptions(otherAttrOptions)}
          onChange={(selected) => {
            const newSelected = selected?.value ?? defaultOnChangeValue;
            onChange(newSelected);
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
