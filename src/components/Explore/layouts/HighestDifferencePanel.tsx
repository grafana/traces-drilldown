import { SceneComponentProps, SceneObjectBase, SceneObjectState, VizPanel } from '@grafana/scenes';
import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import { Trans } from '@grafana/i18n';
import { Button, Stack, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import React from 'react';
import { getFiltersVariable } from '../../../utils/utils';
import { addToFilters } from '../actions/AddToFiltersAction';
import { computeHighestDifference } from '../../../utils/comparison';

interface HighestDifferencePanelState extends SceneObjectState {
  frame: DataFrame;
  panel: VizPanel;
  maxDifference?: number;
  maxDifferenceIndex?: number;
}

export class HighestDifferencePanel extends SceneObjectBase<HighestDifferencePanelState> {
  constructor(state: HighestDifferencePanelState) {
    super({
      ...state,
    });

    this.addActivationHandler(() => this._onActivate());
  }

  private _onActivate() {
    const { frame } = this.state;
    this.setState({ ...computeHighestDifference(frame) });

    this._subs.add(
      this.subscribeToState((newState, prevState) => {
        if (newState.frame !== prevState.frame) {
          const { frame } = newState;
          this.setState({ ...computeHighestDifference(frame) });
        }
      })
    );
  }

  private getAttribute() {
    return this.state.frame.name;
  }

  private getValue() {
    const valueField = this.state.frame.fields.find((f) => f.name === 'Value');
    return valueField?.values[this.state.maxDifferenceIndex || 0];
  }

  /** Comparison frame Value cells can include Prometheus-style quotes; filters must store the raw label (see getLabelValue). */
  private getNormalizedFilterValue(): string {
    const raw = this.getValue();
    if (raw === undefined || raw === null) {
      return '';
    }
    return String(raw).replace(/"/g, '');
  }

  private onIncludeClick = () => {
    const variable = getFiltersVariable(this);
    const attribute = this.getAttribute();
    if (attribute) {
      addToFilters(variable, attribute, this.getNormalizedFilterValue(), '=');
    }
  };

  private onExcludeClick = () => {
    const variable = getFiltersVariable(this);
    const attribute = this.getAttribute();
    if (attribute) {
      addToFilters(variable, attribute, this.getNormalizedFilterValue(), '!=');
    }
  };

  public static Component = ({ model }: SceneComponentProps<HighestDifferencePanel>) => {
    const { maxDifference, maxDifferenceIndex, panel } = model.useState();
    const styles = useStyles2(getStyles);
    const value = model.getValue();
    const normalizedFilterValue = model.getNormalizedFilterValue();
    const key = model.state.frame.name ?? '';
    const variable = getFiltersVariable(model);
    const includeFilterExists = variable.state.filters.find(
      (f) => f.key === key && f.value === normalizedFilterValue && f.operator === '='
    );
    const excludeFilterExists = variable.state.filters.find(
      (f) => f.key === key && f.value === normalizedFilterValue && f.operator === '!='
    );

    return (
      <div className={styles.container}>
        <div className={styles.panelWrap}>
          <panel.Component model={panel} />
        </div>
        <div className={styles.differenceContainer}>
          {maxDifference !== undefined && maxDifferenceIndex !== undefined && (
            <>
              <Stack gap={1} justifyContent={'space-between'} alignItems={'center'}>
                <div className={styles.title}><Trans i18nKey="highest-difference-panel.title">Highest difference</Trans></div>
                <Stack gap={0.5}>
                  {!includeFilterExists && (
                    <Button size="sm" variant="primary" fill="text" onClick={() => model.onIncludeClick()}>
                      <Trans i18nKey="highest-difference-panel.include">Include</Trans>
                    </Button>
                  )}
                  {!excludeFilterExists && (
                    <Button size="sm" variant="primary" fill="text" onClick={() => model.onExcludeClick()}>
                      <Trans i18nKey="highest-difference-panel.exclude">Exclude</Trans>
                    </Button>
                  )}
                </Stack>
              </Stack>
              <div className={styles.differenceValue}>
                {(Math.abs(maxDifference) * 100).toFixed(maxDifference === 0 ? 0 : 2)}%
              </div>
              <div className={styles.value}>{value}</div>
            </>
          )}
        </div>
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      height: '100%',
      minHeight: 0,
    }),
    panelWrap: css({
      flex: '1 1 0',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }),
    differenceContainer: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 0,
      flexShrink: 0,
      border: `1px solid ${theme.colors.secondary.border}`,
      background: theme.colors.background.primary,
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
      fontSize: theme.typography.bodySmall.fontSize,
      gap: theme.spacing(0.5),
    }),
    differenceValue: css({
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.fontWeightBold,
      lineHeight: theme.typography.h2.lineHeight,
      textAlign: 'center',
    }),
    value: css({
      textAlign: 'center',
      color: theme.colors.secondary.text,
      textWrap: 'nowrap',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      lineHeight: theme.typography.body.lineHeight,
      minHeight: theme.spacing(3),
    }),
    title: css({
      fontWeight: 500,
    }),
  };
}
