import { PanelMenuItem, toURLRange, urlUtil } from '@grafana/data';
import { config } from '@grafana/runtime';
import { t } from '@grafana/i18n';
import {
  SceneObjectBase,
  VizPanelMenu,
  SceneObject,
  SceneComponentProps,
  sceneGraph,
  SceneObjectState,
  VizPanel,
} from '@grafana/scenes';
import React from 'react';
import { reportAppInteraction, USER_EVENTS_PAGES, USER_EVENTS_ACTIONS } from 'utils/analytics';
import type { AlertPanelTarget } from '../actions/createAlert/getPanelDataForAlert';
import { getCurrentStep, getDataSource, getTraceExplorationScene } from 'utils/utils';

export type PanelMenuCreateAlertHandler = (vizPanel: VizPanel, targets: AlertPanelTarget[]) => void;

interface PanelMenuState extends SceneObjectState {
  body?: VizPanelMenu;
  query?: string;
  /** Per-panel TraceQL targets for alerting (breakdown tiles). */
  alertTargets?: AlertPanelTarget[];
  /** Parent breakdown scene handles modal + analytics so menu unmount does not drop the modal. */
  onBreakdownCreateAlert?: PanelMenuCreateAlertHandler;
}

export class PanelMenu extends SceneObjectBase<PanelMenuState> implements VizPanelMenu, SceneObject {
  constructor(state: Partial<PanelMenuState>) {
    super(state);
    this.addActivationHandler(() => {
      const items: PanelMenuItem[] = [
        {
          text: t('panel-menu.navigation', 'Navigation'),
          type: 'group',
        },
        {
          text: t('panel-menu.explore', 'Explore'),
          iconClassName: 'compass',
          href: getExploreHref(this),
          onClick: () => onExploreClick(),
        },
      ];

      if (this.state.alertTargets?.length && this.state.onBreakdownCreateAlert) {
        items.push({
          text: t('panel-menu.create-alert', 'Create alert'),
          iconClassName: 'bell',
          onClick: () => {
            const vizPanel = sceneGraph.findObject(this, (o) => o instanceof VizPanel) as VizPanel | undefined;
            const targets = this.state.alertTargets;
            const handler = this.state.onBreakdownCreateAlert;
            if (!vizPanel || !targets?.length || !handler) {
              return;
            }
            handler(vizPanel, targets);
          },
        });
      }

      this.setState({
        body: new VizPanelMenu({
          items,
        }),
      });
    });
  }

  addItem(item: PanelMenuItem): void {
    if (this.state.body) {
      this.state.body.addItem(item);
    }
  }

  setItems(items: PanelMenuItem[]): void {
    if (this.state.body) {
      this.state.body.setItems(items);
    }
  }

  public static readonly Component = ({ model }: SceneComponentProps<PanelMenu>) => {
    const { body } = model.useState();

    if (!body) {
      return null;
    }

    return <body.Component model={body} />;
  };
}

const getExploreHref = (model: SceneObject<PanelMenuState>) => {
  const traceExploration = getTraceExplorationScene(model);
  const datasource = getDataSource(traceExploration);
  const timeRange = sceneGraph.getTimeRange(model).state.value;
  const step = getCurrentStep(model);

  const exploreState = JSON.stringify({
    ['traces-explore']: {
      range: toURLRange(timeRange.raw),
      queries: [{ refId: 'A', datasource, query: model.state.query, step }],
    },
  });
  const subUrl = config.appSubUrl ?? '';
  const exploreUrl = urlUtil.renderUrl(`${subUrl}/explore`, { panes: exploreState, schemaVersion: 1 });
  return exploreUrl;
};

const onExploreClick = () => {
  reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.open_in_explore_clicked);
};
