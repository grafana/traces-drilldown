import React, { useMemo } from 'react';

import { SelectableValue } from '@grafana/data';
import { Icon, Select, Field, useStyles2 } from '@grafana/ui';
import { VariableValue } from '@grafana/scenes';
import { css } from '@emotion/css';

const RECOMMENDED_ATTRIBUTES = [
  'span.http.method', 
  'span.http.request.method', 
  'span.http.route', 
  'span.http.path', 
  'span.http.status_code', 
  'span.http.response.status_code'
]; 

type Props = {
  options: Array<SelectableValue<string>>;
  onChange: (columns: string[]) => void;
  value?: VariableValue;
};

const labelOrder = ['Recommended', 'Resource', 'Span', 'Other'];

export function SpanListColumnsSelector({ options, value, onChange }: Props) {
  const styles = useStyles2(getStyles);

  const opt = useMemo(
    () =>
      Object.values(
        options.reduce((acc, curr) => {
          if (curr.label) {
            const label = curr.label.slice(curr.label.indexOf('.') + 1);

            // use text until first dot as key
            if (RECOMMENDED_ATTRIBUTES.includes(curr.label)) {
              const group = acc['recommended'] ?? { label: 'Recommended', options: [] };
              group.options.push({ ...curr, label });
              acc['recommended'] = group;
            } else if (curr.label.startsWith('resource.')) {
              const group = acc['resource'] ?? { label: 'Resource', options: [] };
              group.options.push({ ...curr, label });
              acc['resource'] = group;
            } else {
              if (curr.label.startsWith('span.')) {
                const group = acc['span'] ?? { label: 'Span', options: [] };
                group.options.push({ ...curr, label });
                acc['span'] = group;
              } else {
                const group = acc['other'] ?? { label: 'Other', options: [] };
                group.options.push(curr);
                acc['other'] = group;
              }
            }
          }
          return acc;
        }, {})
      ).sort((a, b) => labelOrder.indexOf(a.label) - labelOrder.indexOf(b.label)),
    [options]
  );

  return (
    <div className={styles.container}>
      <Field label="Add extra columns">
        <Select
          value={value?.toString() !== '' ? (value?.toString()?.split(',') ?? '') : ''}
          placeholder={'Select an attribute'}
          options={opt}
          onChange={(x) => onChange(x.map((x: SelectableValue) => x.value).join(','))}
          isMulti={true}
          isClearable
          virtualized
          prefix={<Icon name="columns" />}
        />
      </Field>
    </div>
  );
}

const getStyles = () => {
  return {
    container: css({
      display: 'flex',
      minWidth: '300px',

      '& > div': {
        width: '100%',
      },
    }),
  };
};
