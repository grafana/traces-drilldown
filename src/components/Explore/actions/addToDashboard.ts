import { BusEventWithPayload, type TimeRange } from '@grafana/data';
import { sceneGraph, SceneQueryRunner, type SceneObject, type VizPanel } from '@grafana/scenes';
import { type Panel } from '@grafana/schema';

import {
  getPanelDataForAlert,
  type AlertPanelTarget,
} from './createAlert/getPanelDataForAlert';
import { getDataSource, getDatasourceVariable, getTraceExplorationScene } from 'utils/utils';

export const ADD_TO_DASHBOARD_COMPONENT_ID = 'grafana/add-to-dashboard-form/v1';
export const ADD_TO_DASHBOARD_LABEL = 'Add to dashboard';

export interface PanelDataRequestPayload {
  panel: Panel;
  range: TimeRange;
}

interface EventOpenAddToDashboardPayload {
  panelData: PanelDataRequestPayload;
}

export class EventOpenAddToDashboard extends BusEventWithPayload<EventOpenAddToDashboardPayload> {
  public static readonly type = 'open-add-to-dashboard';
}

export interface AddToDashboardFormProps {
  onClose: () => void;
  buildPanel: () => Panel;
  timeRange?: TimeRange;
  options?: { useAbsolutePath: boolean };
}

/** Tempo metrics panels use TraceQL on `query`; interpolate so dashboard panels get resolved filters/vars. */
function interpolateTraceQueryTarget(vizPanel: VizPanel, target: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...target };
  if (next.query != null) {
    const q = next.query as string;
    next.query = q ? sceneGraph.interpolate(vizPanel, q) : q;
  }
  // Dashboard panels use panel-level datasource; scene `${ds}` on targets breaks new dashboards.
  delete next.datasource;
  return next;
}

/** Resolved Tempo UID for dashboard panels (not the `${ds}` scene variable). */
function resolveDashboardDatasource(vizPanel: VizPanel): NonNullable<Panel['datasource']> {
  const exploration = getTraceExplorationScene(vizPanel);
  const uid = getDatasourceVariable(exploration).getValue()?.toString() || getDataSource(exploration);
  return {
    uid,
    type: 'tempo',
  };
}

function findQueryRunner(data: SceneObject | undefined): SceneQueryRunner | undefined {
  if (!data) {
    return undefined;
  }
  const direct = sceneGraph.findObject(data, (o) => o instanceof SceneQueryRunner);
  if (direct instanceof SceneQueryRunner) {
    return direct;
  }
  return sceneGraph.findDescendents(data, SceneQueryRunner)[0];
}

export function getPanelData(
  vizPanel: VizPanel,
  /** Per-tile TraceQL targets (e.g. breakdown with attribute=value). Same as create alert. */
  alertTargets?: AlertPanelTarget[]
): PanelDataRequestPayload {
  if (alertTargets?.length) {
    const fromTargets = getPanelDataForAlert(vizPanel, alertTargets);
    if (fromTargets) {
      return {
        ...fromTargets,
        panel: {
          ...fromTargets.panel,
          datasource: resolveDashboardDatasource(vizPanel),
        },
      };
    }
  }

  const range = sceneGraph.getTimeRange(vizPanel).state.value;
  const data = sceneGraph.getData(vizPanel);
  const found = findQueryRunner(data);

  let targets: Panel['targets'] = [];
  let maxDataPoints: number | undefined;

  if (found) {
    targets = (found.state.queries ?? []).map((q: Record<string, unknown>) =>
      interpolateTraceQueryTarget(vizPanel, q)
    );
    maxDataPoints = found.state.maxDataPoints;
  }

  const vs = vizPanel.state;
  const panel: Panel = {
    type: vs.pluginId,
    title: vs.title ? sceneGraph.interpolate(vizPanel, vs.title) : vs.title,
    targets,
    ...(targets.length > 0 && { datasource: resolveDashboardDatasource(vizPanel) }),
    options: vs.options,
    fieldConfig: vs.fieldConfig as Panel['fieldConfig'],
    ...(vs.description && { description: vs.description }),
    ...(maxDataPoints && { maxDataPoints }),
  };

  return { panel, range };
}
