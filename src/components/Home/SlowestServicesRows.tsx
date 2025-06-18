import { css } from '@emotion/css';
import { DataFrame, GrafanaTheme2, urlUtil } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import React from 'react';
import { EXPLORATIONS_ROUTE, VAR_FILTERS, VAR_METRIC } from 'utils/shared';
import { AttributePanelRow } from './AttributePanelRow';
import { HomepagePanelType } from './AttributePanel';
import { formatDuration } from '../../utils/dates';

type Props = {
  series: DataFrame[];
  type: HomepagePanelType;
};

export const SlowestServicesRows = (props: Props) => {
  const { series, type } = props;
  const styles = useStyles2(getStyles);

  const getLabel = (df: DataFrame) => {
    const valuesField = df.fields.find((f) => f.name !== 'time');
    return valuesField?.labels?.['resource.service.name'].replace(/"/g, '') ?? 'Service name not found';
  };

  const getUrl = (df: DataFrame) => {
    const serviceName = getLabel(df);
    const params = {
      [`var-${VAR_FILTERS}`]: `resource.service.name|=|${serviceName}`,
      [`var-${VAR_METRIC}`]: 'duration',
    };
    return urlUtil.renderUrl(EXPLORATIONS_ROUTE, params);
  };

  const getDuration = (df: DataFrame) => {
    const valuesField = df.fields.find((f) => f.name !== 'time');
    return (
      valuesField?.values?.reduce((x, acc) => {
        if (typeof x === 'number' && !isNaN(x)) {
          return x + acc;
        }
        return acc;
      }, 0) ?? 1
    );
  };

  return (
    <div className={styles.container}>
      {series
        .sort((a, b) => getDuration(b) - getDuration(a))
        .slice(0, 10)
        ?.map((df, index) => (
          <span key={index}>
            <AttributePanelRow
              type={type}
              index={index}
              label={getLabel(df)}
              labelTitle="Service"
              value={formatDuration(getDuration(df) * 1000000 /*s to μs*/)}
              valueTitle="p90"
              url={getUrl(df)}
            />
          </span>
        ))}
    </div>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      padding: `${theme.spacing(2)} 0`,
    }),
  };
}
