import { css } from '@emotion/css';
import { PanelMenuItem, toURLRange, urlUtil } from '@grafana/data';
import { config, usePluginComponent } from '@grafana/runtime';
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
import React, { useEffect } from 'react';
import { useStyles2 } from '@grafana/ui';
import { reportAppInteraction, USER_EVENTS_PAGES, USER_EVENTS_ACTIONS } from 'utils/analytics';
import { useFlagTempoAlerting } from '../../../featureFlags/featureFlags';
import type { AlertPanelTarget } from '../actions/createAlert/getPanelDataForAlert';
import { getCurrentStep, getDataSource, getTraceExplorationScene } from 'utils/utils';

const CREATE_ALERT_FROM_PANEL_PLUGIN_ID = 'grafana/alerting/create-alert-from-panel/v1';

export type PanelMenuCreateAlertHandler = (vizPanel: VizPanel, targets: AlertPanelTarget[]) => void;

interface PanelMenuState extends SceneObjectState {
  body?: VizPanelMenu;
  query?: string;
  isCreateAlertAvailable?: boolean;
  /** Per-panel TraceQL targets for alerting (breakdown tiles). */
  alertTargets?: AlertPanelTarget[];
  /** Parent breakdown scene handles modal + analytics so menu unmount does not drop the modal. */
  onBreakdownCreateAlert?: PanelMenuCreateAlertHandler;
}

export class PanelMenu extends SceneObjectBase<PanelMenuState> implements VizPanelMenu, SceneObject {
  constructor(state: Partial<PanelMenuState>) {
    super({
      isCreateAlertAvailable: false,
      ...state,
    });
    this.addActivationHandler(() => {
      this.setState({
        body: new VizPanelMenu({
          items: buildPanelMenuItems(this, this.state.isCreateAlertAvailable ?? false),
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
    const { component: CreateAlertModal } = usePluginComponent(CREATE_ALERT_FROM_PANEL_PLUGIN_ID);
    const isTempoAlertingEnabled = useFlagTempoAlerting();
    const styles = useStyles2(getStyles);

    useEffect(() => {
      const isCreateAlertAvailable = Boolean(CreateAlertModal) && isTempoAlertingEnabled;
      if (model.state.isCreateAlertAvailable === isCreateAlertAvailable) {
        return;
      }

      model.setState({
        isCreateAlertAvailable,
        body: new VizPanelMenu({
          items: buildPanelMenuItems(model, isCreateAlertAvailable),
        }),
      });
    }, [CreateAlertModal, isTempoAlertingEnabled, model]);

    if (!body) {
      return null;
    }

    return (
      <div className={styles.menu}>
        <body.Component model={body} />
      </div>
    );
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

function buildPanelMenuItems(model: SceneObject<PanelMenuState>, isCreateAlertAvailable: boolean): PanelMenuItem[] {
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

  if (isCreateAlertAvailable && model.state.alertTargets?.length && model.state.onBreakdownCreateAlert) {
    items.push({
      text: t('panel-menu.create-alert', 'Create alert'),
      iconClassName: 'bell',
      onClick: () => {
        const vizPanel = sceneGraph.findObject(model, (o) => o instanceof VizPanel) as VizPanel | undefined;
        const targets = model.state.alertTargets;
        const handler = model.state.onBreakdownCreateAlert;
        if (!vizPanel || !targets?.length || !handler) {
          return;
        }
        handler(vizPanel, targets);
      },
    });
  }

  return items;
}

function getStyles() {
  return {
    menu: css({
      '& [role="menuitem"]': {
        justifyContent: 'flex-start',
        textAlign: 'left',
      },
    }),
  };
}
