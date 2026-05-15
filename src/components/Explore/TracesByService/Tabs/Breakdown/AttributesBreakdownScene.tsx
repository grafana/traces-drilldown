import { css } from '@emotion/css';
import { DataFrame, GrafanaTheme2, type TimeRange } from '@grafana/data';
import { usePluginComponent } from '@grafana/runtime';
import type { Panel } from '@grafana/schema';
import React, { useEffect } from 'react';
import {
  CustomVariable,
  SceneComponentProps,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  VizPanel,
} from '@grafana/scenes';
import { t } from '@grafana/i18n';
import { Stack, useStyles2 } from '@grafana/ui';

import { MetricFunction, MIN_PANEL_HEIGHT } from '../../../../../utils/shared';

import { LayoutSwitcher } from '../../../LayoutSwitcher';
import {
  getPanelDataForAlert,
  type AlertPanelTarget,
  type PanelDataRequestPayload,
} from '../../../actions/createAlert/getPanelDataForAlert';
import { AddToFiltersAction } from '../../../actions/AddToFiltersAction';
import { buildNormalLayout } from '../../../layouts/attributeBreakdown';
import {
  getAttributesAsOptions,
  getGroupByVariable,
  getPercentilesVariable,
  getPrimarySignalVariable,
  getTraceByServiceScene,
  getTraceExplorationScene,
} from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../../../utils/analytics';
import { AttributesDescription } from './AttributesDescription';
import { PercentilesSelect } from './PercentilesSelect';
import { AttributesSidebar } from 'components/Explore/AttributesSidebar';
import { useFavoriteAttributes } from 'hooks/useFavoriteAttributes';

const CREATE_ALERT_FROM_PANEL_PLUGIN_ID = 'grafana/alerting/create-alert-from-panel/v1';

interface AttributesBreakdownSceneState extends SceneObjectState {
  body?: SceneObject;
  /** Grafana alerting modal payload — owned here so panel menu unmount never drops it. */
  createAlertPayload?: PanelDataRequestPayload;
}

export class AttributesBreakdownScene extends SceneObjectBase<AttributesBreakdownSceneState> {
  constructor(state: Partial<AttributesBreakdownSceneState>) {
    super({
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const variable = getGroupByVariable(this);
    const traceExploration = getTraceExplorationScene(this);

    variable.subscribeToState(() => {
      this.setBody(variable);
    });

    getTraceByServiceScene(this).subscribeToState(() => {
      this.setBody(variable);
    });

    getPrimarySignalVariable(this).subscribeToState(() => {
      this.setBody(variable);
    });

    traceExploration.getMetricVariable().subscribeToState(() => {
      this.setBody(variable);
    });

    getPercentilesVariable(this).subscribeToState(() => {
      this.setBody(variable);
    });

    this.setBody(variable);
  }

  private onAddToFiltersClick(payload: any) {
    reportAppInteraction(
      USER_EVENTS_PAGES.analyse_traces,
      USER_EVENTS_ACTIONS.analyse_traces.breakdown_add_to_filters_clicked,
      payload
    );
  }

  public openBreakdownCreateAlert(vizPanel: VizPanel, targets: AlertPanelTarget[]) {
    const data = getPanelDataForAlert(vizPanel, targets);
    if (!data) {
      return;
    }
    reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.create_alert_clicked, {
      title: data.panel.title,
    });
    this.setState({ createAlertPayload: data });
  }

  public clearBreakdownCreateAlert() {
    this.setState({ createAlertPayload: undefined });
  }

  private setBody = (variable: CustomVariable) => {
    this.setState({
      body: buildNormalLayout(
        this,
        variable,
        (frame: DataFrame) => [
          new AddToFiltersAction({ frame, labelKey: variable.getValueText(), onClick: this.onAddToFiltersClick }),
        ],
        (vizPanel, targets) => this.openBreakdownCreateAlert(vizPanel, targets)
      ),
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
    const { body, createAlertPayload } = model.useState();
    const styles = useStyles2(getStyles);

    const { attributes } = getTraceByServiceScene(model).useState();
    const { favoriteAttributes } = useFavoriteAttributes({ scene: model });

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
        model.onChange(favoriteAttributes[0]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupBy]);

    return (
      <div className={styles.container}>
        <BreakdownCreateAlertModalBridge payload={createAlertPayload} scene={model} />
        <div className={styles.controls}>
          <AttributesDescription
            description={description}
            tags={
              metric === 'duration'
                ? []
                : [
                    { label: t('attributes-breakdown-scene.rate-label', 'Rate'), color: 'green' },
                    { label: t('attributes-breakdown-scene.error-label', 'Error'), color: 'red' },
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
              selected={groupBy}
              onAttributeChange={(attribute) => model.onChange(attribute ?? '')}
              model={model}
              showFavorites={true}
            />
            {body && <body.Component model={body} />}
          </Stack>
        </div>
      </div>
    );
  };
}

// Renders the create-alert plugin modal from scene state, not from the panel menu subtree.
// This avoids a lost modal when the menu popover closes/unmounts right after clicking "Create alert".
function BreakdownCreateAlertModalBridge({
  payload,
  scene,
}: {
  payload: PanelDataRequestPayload | undefined;
  scene: AttributesBreakdownScene;
}) {
  const { component: ModalComponent, isLoading } = usePluginComponent<{
    panel: Panel;
    range: TimeRange;
    onDismiss: () => void;
  }>(CREATE_ALERT_FROM_PANEL_PLUGIN_ID);

  useEffect(() => {
    if (payload && !isLoading && !ModalComponent) {
      scene.clearBreakdownCreateAlert();
    }
  }, [ModalComponent, isLoading, payload, scene]);

  if (!payload || !ModalComponent || isLoading) {
    return null;
  }

  return (
    <ModalComponent
      panel={payload.panel}
      range={payload.range}
      onDismiss={() => scene.clearBreakdownCreateAlert()}
    />
  );
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
      minHeight: MIN_PANEL_HEIGHT,
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
