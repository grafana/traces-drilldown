import { css } from '@emotion/css';
import React, { useState } from 'react';

import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Field, RadioButtonGroup, useStyles2 } from '@grafana/ui';

import { GroupBySelector } from '../../../GroupBySelector';
import {
  MetricFunction,
  RESOURCE,
  RESOURCE_ATTR,
  SPAN,
  SPAN_ATTR,
  VAR_FILTERS,
  VAR_METRIC,
  radioAttributesResource,
  radioAttributesSpan,
} from '../../../../../utils/shared';

import { LayoutSwitcher } from '../../../LayoutSwitcher';
import { AddToFiltersAction } from '../../../actions/AddToFiltersAction';
import { buildNormalLayout } from '../../../layouts/attributeBreakdown';
import {
  getAttributesAsOptions,
  getGroupByVariable,
  getTraceByServiceScene,
  getTraceExplorationScene,
} from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../../../utils/analytics';
import { AttributesDescription } from './AttributesDescription';

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
    const groupBy = getGroupByVariable(model).getValueText();
    const defaultScope = groupBy.includes(SPAN_ATTR) || radioAttributesSpan.includes(groupBy) ? SPAN : RESOURCE;
    const [scope, setScope] = useState(defaultScope);
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    const { attributes } = getTraceByServiceScene(model).useState();
    const filterType = scope === RESOURCE ? RESOURCE_ATTR : SPAN_ATTR;
    let filteredAttributes = attributes?.filter((attr) => attr.includes(filterType));
    if (scope === SPAN) {
      filteredAttributes = filteredAttributes?.concat(radioAttributesSpan);
    }

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

    return (
      <div className={styles.container}>
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

        <div className={styles.controls}>
          {filteredAttributes?.length && (
            <div className={styles.controlsLeft}>
              <div className={styles.scope}>
                <Field label="Scope">
                  <RadioButtonGroup
                    options={getAttributesAsOptions([RESOURCE, SPAN])}
                    value={scope}
                    onChange={setScope}
                  />
                </Field>
              </div>

              <div className={styles.groupBy}>
                <GroupBySelector
                  options={getAttributesAsOptions(filteredAttributes!)}
                  radioAttributes={scope === RESOURCE ? radioAttributesResource : radioAttributesSpan}
                  value={groupBy}
                  onChange={model.onChange}
                  model={model}
                />
              </div>
            </div>
          )}
          {body instanceof LayoutSwitcher && (
            <div className={styles.controlsRight}>
              <body.Selector model={body} />
            </div>
          )}
        </div>
        <div className={styles.content}>{body && <body.Component model={body} />}</div>
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
    }),
    controls: css({
      flexGrow: 0,
      display: 'flex',
      alignItems: 'top',
      gap: theme.spacing(2),
    }),
    controlsRight: css({
      flexGrow: 0,
      display: 'flex',
      justifyContent: 'flex-end',
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
  };
}
