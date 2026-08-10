import { render, screen } from '@testing-library/react';
import React from 'react';

import { SceneObject } from '@grafana/scenes';

import { getUnavailableLabel, TraceLogsActions, TraceLogsActionsState } from './TraceLogsActions';
import { LogsLinkProvenance, TraceLogsTarget } from './types';

jest.mock('@grafana/runtime', () => ({
  config: { appSubUrl: '', bootData: { user: { orgRole: 'Viewer' } } },
  usePluginFunctions: () => ({ functions: [] }),
  getDataSourceSrv: () => ({ getInstanceSettings: () => ({ readOnly: true }) }),
  getBackendSrv: () => ({ get: jest.fn(), put: jest.fn() }),
}));

jest.mock('../utils/analytics', () => ({
  reportAppInteraction: jest.fn(),
  USER_EVENTS_PAGES: { analyse_traces: 'analyse_traces' },
  USER_EVENTS_ACTIONS: { analyse_traces: { trace_logs_clicked: 'x', trace_logs_config_saved: 'y' } },
}));

const baseState: TraceLogsActionsState = {
  traceId: 'trace-1',
  logsBounds: { fromMs: 1_000, toMs: 2_000 },
  logsServiceNames: ['checkout'],
  logsTempoDatasourceUid: 'tempo',
};

const detectedTarget: TraceLogsTarget = {
  datasourceUid: 'loki',
  datasourceName: 'Loki',
  provenance: LogsLinkProvenance.Detected,
  strategyId: 'otel-structured-metadata',
  ownsSpanLinks: true,
  probed: true,
};

function renderActions(state: Partial<TraceLogsActionsState>) {
  const model = {
    useState: () => ({ ...baseState, ...state }),
  } as unknown as SceneObject<TraceLogsActionsState>;

  return render(<TraceLogsActions model={model} />);
}

describe('TraceLogsActions', () => {
  it('renders nothing until the trace itself has loaded', () => {
    const { container } = renderActions({ logsServiceNames: [], logsBounds: undefined });

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a disabled action with a spinner while it is still looking for logs', () => {
    renderActions({ logsResolution: 'resolving' });

    const action = screen.getByRole('button', { name: /Logs for this trace/ });

    expect(action).toBeDisabled();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('keeps the action visible but disabled when no logs were found, rather than hiding it', () => {
    renderActions({ logsResolution: 'done' });

    expect(screen.getByRole('button', { name: /Logs for this trace/ })).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Logs for this trace/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
  });

  it('links to the logs once a target has been resolved', () => {
    renderActions({ logsResolution: 'done', logsTarget: detectedTarget });

    const action = screen.getByRole('link', { name: /Logs for this trace/ });

    expect(action).toBeVisible();
    expect(action.getAttribute('href')).toContain('/explore');
    // The query is JSON encoded inside the Explore `panes` parameter.
    expect(decodeURIComponent(action.getAttribute('href') ?? '')).toContain('trace_id=\\"trace-1\\"');
  });

  it('offers no write back on a read only Tempo data source', () => {
    renderActions({ logsResolution: 'done', logsTarget: detectedTarget });

    expect(screen.queryByRole('button', { name: /Save to data source/ })).not.toBeInTheDocument();
  });
});

describe('getUnavailableLabel', () => {
  const configured = {
    datasourceUid: 'loki',
    datasourceName: 'Loki',
    provenance: LogsLinkProvenance.Configured,
    ownsSpanLinks: false,
  };

  it('says it is still looking while probes are in flight', () => {
    expect(getUnavailableLabel(true, undefined)).toMatch(/Looking for logs/);
  });

  it('warns that the data source span links are unfiltered when nothing matched', () => {
    // Those links are rendered whether or not logs exist, so a bare "nothing found" would
    // contradict links that look like they work.
    const label = getUnavailableLabel(false, { ...configured, probed: true, configMissingTraceFilter: true });

    expect(label).toMatch(/No logs matching this trace id/);
    expect(label).toMatch(/does not filter by trace id/);
  });

  it('distinguishes a backend it could not query from one it queried in vain', () => {
    expect(getUnavailableLabel(false, { ...configured, datasourceName: 'Splunk', probed: false })).toMatch(
      /cannot query directly/
    );
    expect(getUnavailableLabel(false, { ...configured, probed: true })).toMatch(/No logs matching this trace id/);
  });
});
