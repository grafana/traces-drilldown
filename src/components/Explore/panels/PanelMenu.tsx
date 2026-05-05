import { PanelMenuItem, toURLRange, urlUtil } from '@grafana/data';
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
import { config, usePluginComponent } from '@grafana/runtime';
import React, { useEffect } from 'react';
import { reportAppInteraction, USER_EVENTS_PAGES, USER_EVENTS_ACTIONS } from 'utils/analytics';
import { getCurrentStep, getDataSource, getTraceExplorationScene } from 'utils/utils';

import {
  ADD_TO_DASHBOARD_COMPONENT_ID,
  ADD_TO_DASHBOARD_LABEL,
  EventOpenAddToDashboard,
  getPanelData,
  type AddToDashboardFormProps,
} from '../actions/addToDashboard';

interface PanelMenuState extends SceneObjectState {
  body?: VizPanelMenu;
  query?: string;
  labelValue?: string;
}

function buildPanelMenuItems(model: SceneObject<PanelMenuState>, includeAddToDashboard: boolean): PanelMenuItem[] {
  const items: PanelMenuItem[] = [
    {
      text: t('panel-menu.navigation', 'Navigation'),
      type: 'group',
    },
    {
      text: t('panel-menu.explore', 'Explore'),
      iconClassName: 'compass',
      href: getExploreHref(model),
      onClick: () => onExploreClick(),
    },
  ];

  if (includeAddToDashboard) {
    items.push({
      text: ADD_TO_DASHBOARD_LABEL,
      iconClassName: 'apps',
      onClick: () => addToDashboardFromPanelMenu(model),
    });
  }

  return items;
}

function addToDashboardFromPanelMenu(model: SceneObject<PanelMenuState>) {
  const vizPanel = sceneGraph.findObject(model, (o) => o instanceof VizPanel) as VizPanel | undefined;
  if (!vizPanel) {
    return;
  }
  const panelData = getPanelData(vizPanel);
  model.publishEvent(new EventOpenAddToDashboard({ panelData }), true);
}

export class PanelMenu extends SceneObjectBase<PanelMenuState> implements VizPanelMenu, SceneObject {
  constructor(state: Partial<PanelMenuState>) {
    super(state);
    this.addActivationHandler(() => {
      this.setState({
        body: new VizPanelMenu({
          items: buildPanelMenuItems(this, false),
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

  public static Component = ({ model }: SceneComponentProps<PanelMenu>) => {
    const { body } = model.useState();
    const { component: addToDashboardForm, isLoading: isLoadingAddToDashboardForm } =
      usePluginComponent<AddToDashboardFormProps>(ADD_TO_DASHBOARD_COMPONENT_ID);

    useEffect(() => {
      if (!body) {
        return;
      }
      const includeAdd = !isLoadingAddToDashboardForm && Boolean(addToDashboardForm);
      model.setItems(buildPanelMenuItems(model, includeAdd));
    }, [model, body, isLoadingAddToDashboardForm, addToDashboardForm]);

    if (body) {
      return <body.Component model={body} />;
    }

    return <></>;
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
