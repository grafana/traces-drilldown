import { css } from '@emotion/css';
import React from 'react';

import { DataFrame, FieldType, GrafanaTheme2, Field } from '@grafana/data';
import {
  CustomVariable,
  SceneComponentProps,
  SceneDataTransformer,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  VariableDependencyConfig,
  VariableValue,
} from '@grafana/scenes';
import { Checkbox, getTheme, Stack, Tooltip, useStyles2 } from '@grafana/ui';

import {
  VAR_FILTERS,
  VAR_PRIMARY_SIGNAL,
  explorationDS,
  VAR_FILTERS_EXPR,
  ALL,
} from '../../../../../utils/shared';

import { LayoutSwitcher } from '../../../LayoutSwitcher';
import { AddToFiltersAction } from '../../../actions/AddToFiltersAction';
import { map, Observable } from 'rxjs';
import { BaselineColor, buildAllComparisonLayout, SelectionColor } from '../../../layouts/allComparison';
// eslint-disable-next-line no-restricted-imports
import { duration } from 'moment';
import { comparisonQuery } from '../../../queries/comparisonQuery';
import { buildAttributeComparison } from '../../../layouts/attributeComparison';
import {
  getAttributesAsOptions,
  getGroupByVariable,
  getPrimarySignalVariable,
  getTraceByServiceScene,
  getTraceExplorationScene,
} from 'utils/utils';
import { InspectAttributeAction } from 'components/Explore/actions/InspectAttributeAction';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../../../utils/analytics';
import { computeHighestDifference } from '../../../../../utils/comparison';
import { AttributesDescription } from '../Breakdown/AttributesDescription';
import { isEqual } from 'lodash';
import { AttributesSidebar } from 'components/Explore/AttributesSidebar';

const HIDE_BASELINE_ONLY_LS_KEY = 'grafana.drilldown.traces.hideBaselineOnly';

export interface AttributesComparisonSceneState extends SceneObjectState {
  body?: SceneObject;
  /** When true, hide panels that only have baseline percentage and no selection value */
  hideBaselineOnlyPanels?: boolean;
}

export class AttributesComparisonScene extends SceneObjectBase<AttributesComparisonSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_FILTERS, VAR_PRIMARY_SIGNAL],
    onReferencedVariableValueChanged: this.onReferencedVariableValueChanged.bind(this),
  });

  constructor(state: Partial<AttributesComparisonSceneState>) {
    const stored = localStorage.getItem(HIDE_BASELINE_ONLY_LS_KEY);
    const hideBaselineOnlyPanels = state.hideBaselineOnlyPanels ?? (stored === 'true');
    super({
      ...state,
      hideBaselineOnlyPanels,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const variable = getGroupByVariable(this);

    variable.changeValueTo(ALL);

    this.updateData();

    variable.subscribeToState((newState, prevState) => {
      if (newState.value !== prevState.value) {
        this.setBody(variable);
      }
    });

    this.subscribeToState((newState, prevState) => {
      if (newState.hideBaselineOnlyPanels !== prevState.hideBaselineOnlyPanels) {
        localStorage.setItem(HIDE_BASELINE_ONLY_LS_KEY, String(newState.hideBaselineOnlyPanels ?? false));
        this.updateData(newState.hideBaselineOnlyPanels, true);
        // Reusing the same query runner: data is already in memory, just re-filtered. Update body on next
        // tick so the new $data is in state (no loading state needed).
        setTimeout(() => this.setBody(variable), 0);
      }
    });

    getPrimarySignalVariable(this).subscribeToState(() => {
      this.updateData();
      this.setBody(variable);
    });

    getTraceByServiceScene(this).subscribeToState((newState, prevState) => {
      if (!isEqual(newState.selection, prevState.selection)) {
        this.updateData();
        this.setBody(variable);
      }
    });

    sceneGraph.getTimeRange(this).subscribeToState(() => {
      this.updateData();
    });

    this.setBody(variable);
  }

  private getFilteredAttributes = (primarySignal: VariableValue): string[] => {
    return primarySignal === 'nestedSetParent<0' ? ['rootName', 'rootServiceName'] : [];
  };

  private updateData(hideBaselineOnly?: boolean, reuseQueryRunner?: boolean): SceneDataTransformer {
    const byServiceScene = getTraceByServiceScene(this);
    const sceneTimeRange = sceneGraph.getTimeRange(this);
    const from = sceneTimeRange.state.value.from.unix();
    const to = sceneTimeRange.state.value.to.unix();
    const primarySignal = getPrimarySignalVariable(this).state.value;
    const filteredAttributes = this.getFilteredAttributes(primarySignal);
    const hideBaselineOnlyPanels = hideBaselineOnly ?? this.state.hideBaselineOnlyPanels ?? false;

    const existingRunner = this.state.$data?.state?.$data as SceneQueryRunner | undefined;
    const queryRunner =
      reuseQueryRunner && existingRunner
        ? existingRunner
        : new SceneQueryRunner({
            datasource: explorationDS,
            queries: [buildQuery(from, to, comparisonQuery(byServiceScene.state.selection))],
          });

    const $data = new SceneDataTransformer({
      $data: queryRunner,
      transformations: [
        () => (source: Observable<DataFrame[]>) => {
          return source.pipe(
            map((data: DataFrame[]) => {
              const groupedFrames = groupFrameListByAttribute(data ?? []);
              let result = Object.entries(groupedFrames)
                .filter(([attribute, _]) => !filteredAttributes.includes(attribute))
                .map(([attribute, frames]) => frameGroupToDataframe(attribute, frames));

              if (hideBaselineOnlyPanels) {
                result = result.filter(hasSelectionValues);
              }
              return result.sort((a, b) => {
                const aCompare = computeHighestDifference(a);
                const bCompare = computeHighestDifference(b);
                return Math.abs(bCompare.maxDifference) - Math.abs(aCompare.maxDifference);
              });
            })
          );
        },
      ],
    });

    this.setState({ $data });
    return $data;
  }

  private onReferencedVariableValueChanged() {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(ALL);
    this.setBody(variable);
  }

  private onAddToFiltersClick(payload: any) {
    reportAppInteraction(
      USER_EVENTS_PAGES.analyse_traces,
      USER_EVENTS_ACTIONS.analyse_traces.comparison_add_to_filters_clicked,
      payload
    );
  }

  private setBody = (variable: CustomVariable) => {
    const traceExploration = getTraceExplorationScene(this);
    this.setState({
      body:
        variable.hasAllValue() || variable.getValue() === ALL
          ? buildAllComparisonLayout(
              (frame) =>
                new InspectAttributeAction({
                  attribute: frame.name,
                  onClick: () => this.onChange(frame.name || ''),
                }),
              traceExploration.getMetricFunction()
            )
          : buildAttributeComparison(
              this,
              variable,
              (frame: DataFrame) => [
                new AddToFiltersAction({
                  frame,
                  labelKey: variable.getValueText(),
                  onClick: this.onAddToFiltersClick,
                }),
              ],
              traceExploration.getMetricFunction()
            ),
    });
  };

  public onChange = (value: string, ignore?: boolean) => {
    const variable = getGroupByVariable(this);
    variable.changeValueTo(value, undefined, !ignore);

    reportAppInteraction(
      USER_EVENTS_PAGES.analyse_traces,
      USER_EVENTS_ACTIONS.analyse_traces.select_attribute_in_comparison_clicked,
      { value }
    );
  };

  public static Component = ({ model }: SceneComponentProps<AttributesComparisonScene>) => {
    const { body, hideBaselineOnlyPanels } = model.useState();
    const variable = getGroupByVariable(model);
    const traceExploration = getTraceExplorationScene(model);
    const { attributes } = getTraceByServiceScene(model).useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <div className={styles.controls}>
          <AttributesDescription
            description="Attributes are ordered by the difference between the baseline and selection values for each value."
            tags={[
              {
                label: 'Baseline',
                color:
                  traceExploration.getMetricFunction() === 'duration'
                    ? BaselineColor
                    : getTheme().visualization.getColorByName('semi-dark-green'),
              },
              {
                label: 'Selection',
                color:
                  traceExploration.getMetricFunction() === 'duration'
                    ? SelectionColor
                    : getTheme().visualization.getColorByName('semi-dark-red'),
              },
            ]}
          />
          <div className={styles.controlsRight}>
            <Tooltip content="Hide panels that only have baseline percentage and no selection">
              <div>
                <Checkbox
                  data-testid="comparison-hide-baseline-only"
                  value={hideBaselineOnlyPanels ?? false}
                  onChange={(ev) => model.setState({ hideBaselineOnlyPanels: ev.currentTarget.checked ?? false })}
                  label="Hide baseline-only"
                />
              </div>
            </Tooltip>
            {body instanceof LayoutSwitcher && <body.Selector model={body} />}
          </div>
        </div>
        <div className={styles.content}>
          <Stack direction="row" gap={2} width="100%">
            <AttributesSidebar
              options={getAttributesAsOptions(attributes ?? [])}
              selected={variable.getValueText()}
              onAttributeChange={(attribute) => model.onChange(attribute ?? '')}
              model={model}
              showFavorites={true}
              allowAllOption={true}
            />
            {body && <body.Component model={body} />}
          </Stack>
        </div>
      </div>
    );
  };
}

export function buildQuery(from: number, to: number, compareQuery: string) {
  const dur = duration(to - from, 's');
  const durString = `${dur.asSeconds()}s`;
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} | compare(${compareQuery})`,
    step: durString,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}

export function hasSelectionValues(df: DataFrame): boolean {
  const selectionField = df.fields.find((f) => f.name === 'Selection');
  return selectionField?.values?.some((v) => (v ?? 0) > 0) ?? false;
}

const groupFrameListByAttribute = (frames: DataFrame[]) => {
  return frames.reduce((acc: Record<string, DataFrame[]>, series) => {
    const numberField = series.fields.find((field) => field.type === 'number');
    const nonInternalKey = Object.keys(numberField?.labels || {}).find((key) => !key.startsWith('__'));
    if (nonInternalKey) {
      acc[nonInternalKey] = [...(acc[nonInternalKey] || []), series];
    }
    return acc;
  }, {});
};

const frameGroupToDataframe = (attribute: string, frames: DataFrame[]): DataFrame => {
  const newFrame: DataFrame = {
    name: attribute,
    refId: attribute,
    fields: [],
    length: 0,
  };

  const valueNameField: Field = {
    name: 'Value',
    type: FieldType.string,
    values: [],
    config: {},
    labels: { [attribute]: attribute },
  };
  const baselineField: Field = {
    name: 'Baseline',
    type: FieldType.number,
    values: [],
    config: {},
  };
  const selectionField: Field = {
    name: 'Selection',
    type: FieldType.number,
    values: [],
    config: {},
  };

  const values = frames.reduce((acc: Record<string, Field[]>, frame) => {
    const numberField = frame.fields.find((field) => field.type === 'number');
    const val = numberField?.labels?.[attribute];
    if (val) {
      acc[val] = [...(acc[val] || []), numberField];
    }
    return acc;
  }, {});

  const baselineTotal = getTotalForMetaType(frames, 'baseline', values);
  const selectionTotal = getTotalForMetaType(frames, 'selection', values);

  newFrame.length = Object.keys(values).length;

  Object.entries(values).forEach(([value, fields]) => {
    valueNameField.values.push(value);
    baselineField.values.push(
      fields.find((field) => field.labels?.['__meta_type'] === '"baseline"')?.values[0] / baselineTotal
    );
    selectionField.values.push(
      fields.find((field) => field.labels?.['__meta_type'] === '"selection"')?.values[0] / selectionTotal
    );
  });
  newFrame.fields = [valueNameField, baselineField, selectionField];
  return newFrame;
};

function getTotalForMetaType(frames: DataFrame[], metaType: string, values: Record<string, Field[]>) {
  // calculate total from values so that we are properly normalizing the field values when dividing by the total
  const calculatedTotal = Object.values(values).reduce((total, fields) => {
    const field = fields.find((field) => field.labels?.['__meta_type'] === `"${metaType}"`);
    return total + (field?.values[0] || 0);
  }, 0);

  let total = frames.reduce((currentValue, frame) => {
    const field = frame.fields.find((f) => f.type === 'number');
    if (field?.labels?.['__meta_type'] === `"${metaType}_total"`) {
      return field.values[0];
    }
    return currentValue;
  }, 1);

  // if the baseline_total or selection_total field is found, but the total value is less than the calculated total
  // we need to return the calculated total otherwise the values will be skewed
  // e.g. calculatedTotal = 100, total = 80
  // if we return the total, the field values will be normalized via 80/100 = 1.25 (incorrect)
  // if we return the calculated total, the field values will be normalized via 100/100 = 1 (correct)
  if (total < calculatedTotal) {
    return calculatedTotal === 0 ? 1 : calculatedTotal; // fallback to 1 to avoid division by zero
  }

  // 1 if the baseline_total or selection_total field is not found
  // 0 if the baseline_total or selection_total field is found, but the total value is 0
  if (total === 1 || total === 0) {
    return calculatedTotal === 0 ? 1 : calculatedTotal;
  }

  return total;
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
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(2),
      padding: `${theme.spacing(1)} 0 ${theme.spacing(2)} 0`,
    }),
    controlsLeft: css({
      display: 'flex',
      justifyContent: 'flex-left',
      justifyItems: 'left',
      width: '100%',
      flexDirection: 'column',
    }),
  };
}
