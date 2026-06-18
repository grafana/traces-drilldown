import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import React from 'react';

function TempoLogoComponent() {
  const styles = useStyles2(getStyles);
  return (
    <img alt="" className={styles.logo} src="public/plugins/grafana-exploretraces-app/img/logo.svg" />
  );
}

export const TempoLogo = React.memo(TempoLogoComponent);

const getStyles = (theme: GrafanaTheme2) => ({
  logo: css`
    width: 16px;
    height: 16px;
    margin-right: ${theme.spacing(0.75)};
    position: relative;
    top: -2px;
  `,
});
