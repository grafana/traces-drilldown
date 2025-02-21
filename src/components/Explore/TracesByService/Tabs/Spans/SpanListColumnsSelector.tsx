import React from 'react';

import { SelectableValue } from '@grafana/data';
import { Select, Field } from '@grafana/ui';
import { VariableValue } from '@grafana/scenes';

type Props = {
  options: Array<SelectableValue<string>>;
  onChange: (columns: string[]) => void;
  value?: VariableValue;
};

export function SpanListColumnsSelector({ options, value, onChange }: Props) {
  return (
    <Field label="Show these extra columns">
      <Select
        value={value?.toString() !== '' ? value?.toString()?.split(',') ?? '' : ''}
        placeholder={'Please select'}
        options={options}
        onChange={(x) => onChange(x.map((x: SelectableValue) => x.label).join(','))}
        isMulti={true}
        isClearable
        virtualized
        width={'auto'}
      />
    </Field>
  );
}
