import { CustomVariable } from '@grafana/scenes';
import { Field, MultiCombobox } from '@grafana/ui';
import React, { useEffect } from 'react';

export const QuantilesSelect = ({ quantilesVariable }: { quantilesVariable: CustomVariable }) => {
  const { value: quantilesValue } = quantilesVariable.useState();

  const options = [
    { label: 'p50', value: '0.5' },
    { label: 'p75', value: '0.75' },
    { label: 'p90', value: '0.9' },
    { label: 'p95', value: '0.95' },
    { label: 'p99', value: '0.99' },
  ];

  useEffect(() => {
    if (!quantilesValue || (Array.isArray(quantilesValue) && quantilesValue.length === 0)) {
      quantilesVariable.changeValueTo(['0.9']);
    }
  }, [quantilesValue, quantilesVariable]);

  return (
    <Field label="Percentiles">
      <MultiCombobox<string>
        width={'auto'}
        minWidth={20}
        isClearable={false}
        options={options}
        value={quantilesValue as string[]}
        onChange={(value) => {
          if (Array.isArray(value)) {
            quantilesVariable.changeValueTo(value.map((v) => v.value));
          }
        }}
      />
    </Field>
  );
};
