import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { CustomVariable } from '@grafana/scenes';
import { Label, MultiCombobox, Stack, useStyles2 } from '@grafana/ui';
import { t, Trans } from '@grafana/i18n';
import React, { useEffect } from 'react';

export const PercentilesSelect = ({ percentilesVariable }: { percentilesVariable: CustomVariable }) => {
  const { value: percentilesValue } = percentilesVariable.useState();
  const styles = useStyles2(getStyles);

  const options = [
    { label: t('percentiles-select.p50', 'p50'), value: '0.5' },
    { label: t('percentiles-select.p75', 'p75'), value: '0.75' },
    { label: t('percentiles-select.p90', 'p90'), value: '0.9', description: t('percentiles-select.default', 'Default') },
    { label: t('percentiles-select.p95', 'p95'), value: '0.95' },
    { label: t('percentiles-select.p99', 'p99'), value: '0.99' },
  ];

  useEffect(() => {
    if (!percentilesValue || (Array.isArray(percentilesValue) && percentilesValue.length === 0)) {
      percentilesVariable.changeValueTo(['0.9']);
    }
  }, [percentilesValue, percentilesVariable]);

  return (
    <Stack>
      <Label className={styles.label}><Trans i18nKey="percentiles-select.label">Percentiles</Trans></Label>
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
    </Stack>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    label: css({
      marginBottom: theme.spacing(0),
      display: 'flex',
      alignItems: 'center',
    }),
  };
}
