import { css } from '@emotion/css';
import { DataFrame, GrafanaTheme2, urlUtil } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import React from 'react';
import { EXPLORATIONS_ROUTE } from 'utils/shared';
import { AttributePanelRow } from './AttributePanelRow';
import { HomepagePanelType } from './AttributePanel';

type Props = {
  series: DataFrame[];
  type: HomepagePanelType;
};

export const ErroredServicesRows = (props: Props) => {
  const { series, type } = props;
  const styles = useStyles2(getStyles);

  const getLabel = (df: DataFrame) => {
    const valuesField = df.fields.find((f) => f.name !== 'time');
    return valuesField?.labels?.['resource.service.name'].replace(/"/g, '') ?? 'Service name not found';
  };

  const getUrl = (df: DataFrame) => {
    const serviceName = getLabel(df);
    const params = {
      'var-filters': `resource.service.name|=|${serviceName}`,
      'var-metric': 'errors',
    };
    const url = urlUtil.renderUrl(EXPLORATIONS_ROUTE, params);
    return `${url}&var-filters=nestedSetParent|<|0`;
  };

  const getTotalErrs = (df: DataFrame) => {
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
        .sort((a, b) => getTotalErrs(b) - getTotalErrs(a))
        .slice(0, 10)
        ?.map((df, index) => (
          <span key={index}>
            <AttributePanelRow
              type={type}
              index={index}
              label={getLabel(df)}
              labelTitle="Service"
              value={getTotalErrs(df)}
              valueTitle="Total errors"
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
