import { CustomVariable } from '@grafana/scenes';
import { Field, MultiCombobox } from '@grafana/ui';
import React, { useEffect } from 'react';

export const PercentilesSelect = ({ percentilesVariable }: { percentilesVariable: CustomVariable }) => {
  const { value: percentilesValue } = percentilesVariable.useState();

  const options = [
    { label: 'p50', value: '0.5' },
    { label: 'p75', value: '0.75' },
    { label: 'p90', value: '0.9' },
    { label: 'p95', value: '0.95' },
    { label: 'p99', value: '0.99' },
  ];

  useEffect(() => {
    if (!percentilesValue || (Array.isArray(percentilesValue) && percentilesValue.length === 0)) {
      percentilesVariable.changeValueTo(['0.9']);
    }
  }, [percentilesValue, percentilesVariable]);

  return (
    <Field label="Percentiles">
      <MultiCombobox<string>
        width={'auto'}
        minWidth={20}
        isClearable={false}
        options={options}
        value={percentilesValue as string[]}
        onChange={(value) => {
          if (Array.isArray(value)) {
            percentilesVariable.changeValueTo(value.map((v) => v.value));
          }
        }}
      />
    </Field>
  );
};
