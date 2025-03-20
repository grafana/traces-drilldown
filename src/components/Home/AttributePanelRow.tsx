import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { Icon, useStyles2 } from '@grafana/ui';
import React from 'react';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';
import { HomepagePanelType } from './AttributePanel';

type Props = {
  index: number;
  type: HomepagePanelType;
  label: string;
  labelTitle: string;
  value: string;
  valueTitle: string;
  url: string;
};

export const AttributePanelRow = (props: Props) => {
  const { index, type, label, labelTitle, value, valueTitle, url } = props;
  const styles = useStyles2(getStyles);

  return (
    <div key={index}>
      {index === 0 && (
        <div className={styles.rowHeader}>
          <span>{labelTitle}</span>
          <span className={styles.valueTitle}>{valueTitle}</span>
        </div>
      )}

      <div
        className={styles.row}
        key={index}
        onClick={() => {
          reportAppInteraction(USER_EVENTS_PAGES.home, USER_EVENTS_ACTIONS.home.panel_row_clicked, {
            type,
            index,
            value,
          });
          locationService.push(url);
        }}
      >
        <div className={'rowLabel'}>{label}</div>

        <div className={styles.action}>
          <span className={styles.actionText}>{value}</span>
          <Icon className={styles.actionIcon} name="arrow-right" size="xl" />
        </div>
      </div>
    </div>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    rowHeader: css({
      color: theme.colors.text.secondary,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `0 ${theme.spacing(2)} ${theme.spacing(1)} ${theme.spacing(2)}`,
    }),
    valueTitle: css({
      margin: '0 45px 0 0',
    }),
    row: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing(2),
      padding: `${theme.spacing(0.75)} ${theme.spacing(2)}`,

      '&:hover': {
        backgroundColor: theme.isDark ? theme.colors.background.secondary : theme.colors.background.primary,
        cursor: 'pointer',
        '.rowLabel': {
          textDecoration: 'underline',
        },
      },
    }),
    action: css({
      display: 'flex',
      alignItems: 'center',
    }),
    actionText: css({
      color: '#d5983c',
      padding: `0 ${theme.spacing(1)}`,
      width: 'max-content',
    }),
    actionIcon: css({
      cursor: 'pointer',
      margin: `0 ${theme.spacing(0.5)} 0 ${theme.spacing(1)}`,
    }),
  };
}
