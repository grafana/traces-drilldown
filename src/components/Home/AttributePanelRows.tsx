import { css } from '@emotion/css';
import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import { Icon, useStyles2 } from '@grafana/ui';
import React from 'react';
import { HomepagePanelType } from './AttributePanel';
import { ErroredServicesRows } from './ErroredServicesRows';
import { SlowestTracesRows } from './SlowestTracesRows';
import { SlowestServicesRows } from './SlowestServicesRows';

type Props = {
  series?: DataFrame[];
  type: HomepagePanelType;
  message?: string;
};

export const AttributePanelRows = (props: Props) => {
  const { series, type, message } = props;
  const styles = useStyles2(getStyles);

  if (message) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <Icon className={styles.icon} name="exclamation-circle" size="xl" />
          {message}
        </div>
      </div>
    );
  }

  if (series && series.length > 0) {
    switch (type) {
      case 'slowest-traces':
        return <SlowestTracesRows series={series} type={type} />;
      case 'errored-services':
        return <ErroredServicesRows series={series} type={type} />;
      case 'slowest-services':
        return <SlowestServicesRows series={series} type={type} />;
    }
  }
  return <div className={styles.container}>No series data</div>;
};

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      padding: `${theme.spacing(2)} 0`,
    }),
    icon: css({
      margin: `0 ${theme.spacing(0.5)} 0 ${theme.spacing(1)}`,
    }),
    message: css({
      display: 'flex',
      gap: theme.spacing(1.5),
      margin: `${theme.spacing(2)} auto`,
      width: '60%',
    }),
  };
}
