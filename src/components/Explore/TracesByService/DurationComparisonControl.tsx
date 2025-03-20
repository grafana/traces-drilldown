import React from 'react';

import { SceneObjectBase, SceneComponentProps, SceneObjectState } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getMetricValue, getTraceByServiceScene, shouldShowSelection } from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { ComparisonSelection } from '../../../utils/shared';

export interface ComparisonControlState extends SceneObjectState {
  selection?: ComparisonSelection;
}

export class DurationComparisonControl extends SceneObjectBase<ComparisonControlState> {
  public constructor({ selection }: ComparisonControlState) {
    super({ selection });
  }

  public startInvestigation = () => {
    const byServiceScene = getTraceByServiceScene(this);
    byServiceScene.setState({ selection: this.state.selection });
    if (!shouldShowSelection(byServiceScene.state.actionView)) {
      byServiceScene.setActionView('comparison');
    }

    reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.start_investigation, {
      selection: this.state.selection,
      metric: getMetricValue(this),
    });
  };

  public static Component = ({ model }: SceneComponentProps<DurationComparisonControl>) => {
    const { selection } = getTraceByServiceScene(model).useState();
    const styles = useStyles2(getStyles);

    const isDisabled = selection?.type === 'auto';
    const tooltip = isDisabled
      ? 'Slowest traces are selected, navigate to the Comparison or Slow Traces tab for more details.'
      : undefined;

    return (
      <div className={styles.wrapper}>
        <Button
          variant="secondary"
          size="sm"
          fill="solid"
          disabled={isDisabled}
          icon={'bolt'}
          onClick={model.startInvestigation}
          tooltip={tooltip}
        >
          {isDisabled ? 'Slowest traces selected' : 'Select slowest traces'}
        </Button>
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    wrapper: css({
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
    }),
    placeholder: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      display: 'flex',
      gap: theme.spacing.x0_5,
    }),
  };
}
