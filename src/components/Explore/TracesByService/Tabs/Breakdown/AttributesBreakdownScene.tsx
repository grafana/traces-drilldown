import { css } from '@emotion/css';
import React, { useEffect } from 'react';

import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Stack, useStyles2 } from '@grafana/ui';

import { MetricFunction, VAR_FILTERS, VAR_METRIC, radioAttributesResource } from '../../../../../utils/shared';

import { LayoutSwitcher } from '../../../LayoutSwitcher';
import { AddToFiltersAction } from '../../../actions/AddToFiltersAction';
import { buildNormalLayout } from '../../../layouts/attributeBreakdown';
import {
  getAttributesAsOptions,
  getGroupByVariable,
  getPercentilesVariable,
  getTraceByServiceScene,
  getTraceExplorationScene,
} from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../../../utils/analytics';
import { AttributesDescription } from './AttributesDescription';
import { PercentilesSelect } from './PercentilesSelect';
import { AttributesSidebar } from 'components/Explore/AttributesSidebar';

export interface AttributesBreakdownSceneState extends SceneObjectState {
  body?: SceneObject;
}

export class AttributesBreakdownScene extends SceneObjectBase<AttributesBreakdownSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_FILTERS, VAR_METRIC],
    onReferencedVariableValueChanged: this.onReferencedVariableValueChanged.bind(this),
  });

  constructor(state: Partial<AttributesBreakdownSceneState>) {
    super({
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const variable = getGroupByVariable(this);

    variable.subscribeToState(() => {
      this.setBody(variable);
    });

    getTraceByServiceScene(this).subscribeToState(() => {
      this.setBody(variable);
    });

    this.setBody(variable);
  }

  private onReferencedVariableValueChanged() {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(radioAttributesResource[0]);
    this.setBody(variable);
  }

  private onAddToFiltersClick(payload: any) {
    reportAppInteraction(
      USER_EVENTS_PAGES.analyse_traces,
      USER_EVENTS_ACTIONS.analyse_traces.breakdown_add_to_filters_clicked,
      payload
    );
  }

  private setBody = (variable: CustomVariable) => {
    this.setState({
      body: buildNormalLayout(this, variable, (frame: DataFrame) => [
        new AddToFiltersAction({ frame, labelKey: variable.getValueText(), onClick: this.onAddToFiltersClick }),
      ]),
    });
  };

  public onChange = (value: string, ignore?: boolean) => {
    const variable = getGroupByVariable(this);
    if (variable.getValueText() !== value) {
      variable.changeValueTo(value, undefined, !ignore);

      reportAppInteraction(
        USER_EVENTS_PAGES.analyse_traces,
        USER_EVENTS_ACTIONS.analyse_traces.breakdown_group_by_changed,
        {
          groupBy: value,
        }
      );
    }
  };

  public static Component = ({ model }: SceneComponentProps<AttributesBreakdownScene>) => {
    const percentilesVariable = getPercentilesVariable(model);

    const { value: groupByValue } = getGroupByVariable(model).useState();
    const groupBy = groupByValue as string;
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    const { attributes } = getTraceByServiceScene(model).useState();

    const exploration = getTraceExplorationScene(model);
    const { value: metric } = exploration.getMetricVariable().useState();
    const getDescription = (metric: MetricFunction) => {
      switch (metric) {
        case 'rate':
          return 'Attributes are ordered by their rate of requests per second.';
        case 'errors':
          return 'Attributes are ordered by their rate of errors per second.';
        case 'duration':
          return 'Attributes are ordered by their average duration.';
        default:
          throw new Error('Metric not supported');
      }
    };
    const description = getDescription(metric as MetricFunction);

    useEffect(() => {
      if (!groupBy || groupBy === 'All' || groupBy === '') {
        model.onChange(radioAttributesResource[0]);
      }
    }, [groupBy]);

    return (
      <div className={styles.container}>
        <div className={styles.controls}>
          <AttributesDescription
            description={description}
            tags={
              metric === 'duration'
                ? []
                : [
                    { label: 'Rate', color: 'green' },
                    { label: 'Error', color: 'red' },
                  ]
            }
          />
          {body instanceof LayoutSwitcher && (
            <div className={styles.controlsRight}>
              {metric === 'duration' && (
                <div className={styles.percentiles}>
                  <PercentilesSelect percentilesVariable={percentilesVariable} />
                </div>
              )}
              <body.Selector model={body} />
            </div>
          )}
        </div>
        <div className={styles.content}>
          <Stack direction="row" gap={2} width="100%">
            <AttributesSidebar
              options={getAttributesAsOptions(attributes ?? [])}
              selectedAttribute={groupBy}
              onAttributeChange={(attribute) => model.onChange(attribute ?? '')}
            />
            {body && <body.Component model={body} />}
          </Stack>
        </div>
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      flexGrow: 1,
      display: 'flex',
      minHeight: '100%',
      flexDirection: 'column',
    }),
    content: css({
      flexGrow: 1,
      display: 'flex',
      paddingTop: theme.spacing(0),
      height: 'calc(100vh - 550px)',
    }),
    controls: css({
      flexGrow: 0,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(2),
    }),
    controlsRight: css({
      flexGrow: 2,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      gap: theme.spacing(2),
      flex: '1 0 auto',
    }),
    scope: css({
      marginRight: theme.spacing(2),
    }),
    groupBy: css({
      width: '100%',
    }),
    controlsLeft: css({
      display: 'flex',
      justifyContent: 'flex-left',
      justifyItems: 'left',
      width: '100%',
      flexDirection: 'row',
    }),
    percentiles: css({
      display: 'flex',
      height: 'fit-content',
      justifyContent: 'flex-end',
    }),
  };
}
