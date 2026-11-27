import { BusEventWithPayload, rangeUtil, type DateTime } from '@grafana/data';
import { config } from '@grafana/runtime';
import { sceneGraph, SceneDataNode, type VizPanel } from '@grafana/scenes';
import { type Panel } from '@grafana/schema';

import { getCurrentStep } from 'utils/utils';

import { getPanelData } from './addToDashboard';
import { type AlertPanelTarget } from './createAlert/getPanelDataForAlert';

export const ADD_TO_NOTEBOOK_COMPONENT_ID = 'grafana/add-to-notebook-form/v1';

export interface NotebookCapture {
  panel: Panel;
  capturedTimeRange: { from: string; to: string; timeZone?: string };
}

export interface AddToNotebookFormProps {
  onClose: () => void;
  buildPanel: () => Panel;
  capturedTimeRange: NotebookCapture['capturedTimeRange'];
}

export function cloneNotebookPanel(panel: Panel): Panel {
  return JSON.parse(JSON.stringify(panel));
}

function captureBound(raw: DateTime | string, resolved: DateTime): string {
  if (rangeUtil.isRelativeTime(raw)) {
    return String(raw);
  }
  return (typeof raw === 'string' ? resolved : raw).toISOString();
}

export class EventOpenAddToNotebook extends BusEventWithPayload<NotebookCapture> {
  public static readonly type = 'open-add-to-notebook';
}

export function canAddToNotebook(): boolean {
  const permissions = config.bootData.user.permissions;
  return Boolean(permissions?.['notebooks:create'] || permissions?.['notebooks:write']);
}

export function isNotebookTile(vizPanel: VizPanel, targets?: AlertPanelTarget[]): boolean {
  return (
    vizPanel.state.pluginId === 'timeseries' &&
    vizPanel.state.$data instanceof SceneDataNode &&
    Boolean(targets?.length) &&
    Boolean(
      targets?.every((target) => target.queryType === 'traceql' && typeof target.query === 'string' && target.query)
    )
  );
}

export function captureNotebookTile(vizPanel: VizPanel, targets?: AlertPanelTarget[]): NotebookCapture | undefined {
  if (!isNotebookTile(vizPanel, targets)) {
    return undefined;
  }
  const { panel, range } = getPanelData(vizPanel, targets);
  if (!panel.targets?.length || typeof panel.datasource !== 'object' || !panel.datasource?.uid) {
    return undefined;
  }
  const step = getCurrentStep(vizPanel);
  return {
    panel: cloneNotebookPanel({
      ...panel,
      targets: panel.targets.map((target) => ({ ...target, ...(step !== undefined && { step }) })),
    }),
    capturedTimeRange: {
      from: captureBound(range.raw.from, range.from),
      to: captureBound(range.raw.to, range.to),
      timeZone: sceneGraph.getTimeRange(vizPanel).getTimeZone(),
    },
  };
}
