import type { TimeRange } from '@grafana/data';
import type { Panel } from '@grafana/schema';
import { sceneGraph, VizPanel, SceneQueryRunner, type SceneObject } from '@grafana/scenes';

import { VAR_DATASOURCE_EXPR } from '../../../../utils/shared';

export interface PanelDataRequestPayload {
  panel: Panel;
  range: TimeRange;
}

/** Grafana panel targets include datasource-specific fields (e.g. TraceQL `query`). */
export type AlertPanelTarget = Record<string, unknown>;

function interpolateQueryTarget(vizPanel: VizPanel, query: AlertPanelTarget): AlertPanelTarget {
  const q = { ...query };
  if (typeof q.query === 'string') {
    q.query = sceneGraph.interpolate(vizPanel, q.query);
  }
  if (typeof q.expr === 'string') {
    q.expr = sceneGraph.interpolate(vizPanel, q.expr);
  }
  if (typeof q.legendFormat === 'string') {
    q.legendFormat = sceneGraph.interpolate(vizPanel, q.legendFormat);
  }
  return q;
}

function interpolateDatasource(vizPanel: VizPanel, ds: Panel['datasource']): Panel['datasource'] {
  if (!ds || typeof ds !== 'object') {
    return ds;
  }
  const uid = ds.uid;
  return {
    ...ds,
    uid: uid ? sceneGraph.interpolate(vizPanel, uid) : uid,
  };
}

function findQueryRunner(data: SceneObject): SceneQueryRunner | undefined {
  const direct = sceneGraph.findObject(data, (o) => o instanceof SceneQueryRunner);
  if (direct instanceof SceneQueryRunner) {
    return direct;
  }
  const fromDescendents = sceneGraph.findDescendents(data, SceneQueryRunner);
  return fromDescendents[0];
}

/** Builds alerting payload from a VizPanel (TraceQL / Tempo metrics queries). */
export function getPanelDataForAlert(
  vizPanel: VizPanel,
  alertTargets?: AlertPanelTarget[]
): PanelDataRequestPayload | null {
  const data = sceneGraph.getData(vizPanel);
  if (!data) {
    return null;
  }

  const queryRunner = findQueryRunner(data);
  const timeRange = sceneGraph.getTimeRange(vizPanel);
  const range = timeRange.state.value;

  let targets: AlertPanelTarget[] = [];
  let datasource: Panel['datasource'];
  let maxDataPoints: number | undefined;

  // Prefer explicit targets (e.g. breakdown tiles with attribute=value). Otherwise sceneGraph
  // finds the layout StepQueryRunner and we would send the aggregate query without per-series filters.
  if (alertTargets?.length) {
    targets = alertTargets.map((q) => interpolateQueryTarget(vizPanel, q));
    datasource = interpolateDatasource(vizPanel, { uid: VAR_DATASOURCE_EXPR });
    maxDataPoints = queryRunner?.state.maxDataPoints;
  } else if (queryRunner) {
    targets = (queryRunner.state.queries ?? []).map((q) => interpolateQueryTarget(vizPanel, q as AlertPanelTarget));
    datasource = interpolateDatasource(vizPanel, queryRunner.state.datasource as Panel['datasource']);
    maxDataPoints = queryRunner.state.maxDataPoints;
  }

  if (!targets.length) {
    return null;
  }

  const titleRaw = vizPanel.state.title;
  const panel: Panel = {
    type: vizPanel.state.pluginId,
    title: titleRaw ? sceneGraph.interpolate(vizPanel, titleRaw) : titleRaw,
    targets: targets as Panel['targets'],
    datasource,
    options: vizPanel.state.options,
    fieldConfig: vizPanel.state.fieldConfig as Panel['fieldConfig'],
    ...(vizPanel.state.description && { description: vizPanel.state.description }),
    ...(maxDataPoints && { maxDataPoints }),
  };

  return { panel, range };
}
