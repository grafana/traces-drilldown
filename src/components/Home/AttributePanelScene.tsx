import { css } from '@emotion/css';
import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import { SceneObjectState, SceneObjectBase, SceneComponentProps } from '@grafana/scenes';
import { Icon, useStyles2 } from '@grafana/ui';
import React from 'react';
import { AttributePanelRows } from './AttributePanelRows';
import { HomepagePanelType } from './AttributePanel';

interface AttributePanelSceneState extends SceneObjectState {
  series?: DataFrame[];
  title: string;
  type: HomepagePanelType;
  message?: string;
}

export class AttributePanelScene extends SceneObjectBase<AttributePanelSceneState> {
  public static Component = ({ model }: SceneComponentProps<AttributePanelScene>) => {
    const { series, title, type, message } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <div className={styles.title}>
          <Icon name={getIcon(type)} size="lg" />
          <span className={styles.titleText}>{title}</span>
        </div>
        <AttributePanelRows series={series} type={type} message={message} />
      </div>
    );
  };
}

function getIcon(type: HomepagePanelType) {
  switch (type) {
    case 'slowest-services':
      return 'clock-nine';
    case 'slowest-traces':
      return 'crosshair';
    case 'errored-services':
      return 'exclamation-triangle';
    default:
      return 'exclamation-triangle';
  }
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      border: `1px solid ${theme.isDark ? theme.colors.border.medium : theme.colors.border.weak}`,
      borderRadius: theme.spacing(0.5),
      marginBottom: theme.spacing(4),
      width: '100%',
    }),
    title: css({
      color: theme.isDark ? theme.colors.text.secondary : theme.colors.text.primary,
      backgroundColor: theme.isDark ? theme.colors.background.secondary : theme.colors.background.primary,
      borderTopLeftRadius: theme.spacing(0.5),
      borderTopRightRadius: theme.spacing(0.5),
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '1.3rem',
      padding: `${theme.spacing(1.5)} ${theme.spacing(2)}`,
    }),
    titleText: css({
      marginLeft: theme.spacing(1),
    }),
  };
}
