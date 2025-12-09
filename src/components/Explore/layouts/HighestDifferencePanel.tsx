import { SceneComponentProps, SceneObjectBase, SceneObjectState, VizPanel } from '@grafana/scenes';
import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import { Button, Stack, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import React from 'react';
import { getFiltersVariable } from '../../../utils/utils';
import { addToFilters, filterExistsForKey } from '../actions/AddToFiltersAction';
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

  private onAddToFilters() {
    const variable = getFiltersVariable(this);
    const attribute = this.getAttribute();
    if (attribute) {
      addToFilters(variable, attribute, this.getValue());
    }
  }

  public static Component = ({ model }: SceneComponentProps<HighestDifferencePanel>) => {
    const { maxDifference, maxDifferenceIndex, panel } = model.useState();
    const styles = useStyles2(getStyles);
    const value = model.getValue();
    const key = model.state.frame.name ?? '';
    const filterExists = filterExistsForKey(getFiltersVariable(model), key, value.replace(/"/g, ''));

    return (
      <div className={styles.container}>
        {<panel.Component model={panel} />}
        <div className={styles.differenceContainer}>
          {maxDifference !== undefined && maxDifferenceIndex !== undefined && (
            <>
              <Stack gap={1} justifyContent={'space-between'} alignItems={'center'}>
                <div className={styles.title}>Highest difference</div>
                {!filterExists && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={'search-plus'}
                    fill="text"
                    onClick={() => model.onAddToFilters()}
                  >
                    Add to filters
                  </Button>
                )}
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
    }),
    differenceContainer: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      border: `1px solid ${theme.colors.secondary.border}`,
      background: theme.colors.background.primary,
      padding: '8px',
      marginBottom: theme.spacing(2),
      fontSize: '12px',
      height: '116px',
    }),
    differenceValue: css({
      fontSize: '36px',
      fontWeight: 'bold',
      textAlign: 'center',
    }),
    value: css({
      textAlign: 'center',
      color: theme.colors.secondary.text,
      textWrap: 'nowrap',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    title: css({
      fontWeight: 500,
    }),
  };
}
