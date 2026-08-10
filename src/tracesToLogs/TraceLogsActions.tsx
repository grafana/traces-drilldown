import { css } from '@emotion/css';
import React, { useCallback, useEffect, useState } from 'react';

import { dateTime, GrafanaTheme2, PluginExtensionLink, TimeRange, urlUtil } from '@grafana/data';
import { t } from '@grafana/i18n';
import { config, usePluginFunctions } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { SceneObject, SceneObjectState } from '@grafana/scenes';
import { Button, LinkButton, Tooltip, useStyles2 } from '@grafana/ui';

import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../utils/analytics';
import { canWriteDatasources, isDatasourceEditable, saveTraceToLogsConfig } from './saveTraceToLogsConfig';
import { getStrategy } from './strategies';
import { LogsLinkProvenance, TimeBoundsMs, TraceLogsTarget } from './types';

/**
 * Structural type of the owning scene, kept narrow so this component does not have to import
 * `TraceViewPanelScene` and create a cycle.
 */
export interface TraceLogsActionsState extends SceneObjectState {
  traceId: string;
  logsTarget?: TraceLogsTarget;
  logsBounds?: TimeBoundsMs;
  logsServiceNames?: string[];
  logsTempoDatasourceUid?: string;
}

/** Ref id of the Loki query behind the "Logs for this trace" action. */
const TRACE_LOGS_QUERY_REF_ID = 'traceLogs';

type ContextForLinks = { targets: DataQuery[]; timeRange: TimeRange };
type ContextForLinksFn = (context: ContextForLinks) => PluginExtensionLink | undefined;

function toTimeRange(bounds: TimeBoundsMs): TimeRange {
  const from = dateTime(bounds.fromMs);
  const to = dateTime(bounds.toMs);

  return { from, to, raw: { from, to } };
}

function buildExploreUrl(datasourceUid: string, expr: string, bounds: TimeBoundsMs): string {
  const panes = JSON.stringify({
    ['trace-logs']: {
      datasource: datasourceUid,
      queries: [
        { refId: TRACE_LOGS_QUERY_REF_ID, datasource: { uid: datasourceUid, type: 'loki' }, expr, queryType: 'range' },
      ],
      range: { from: String(bounds.fromMs), to: String(bounds.toMs) },
    },
  });

  return urlUtil.renderUrl(`${config.appSubUrl ?? ''}/explore`, { panes, schemaVersion: 1 });
}

function getProvenanceLabel(target: TraceLogsTarget): string {
  switch (target.provenance) {
    case LogsLinkProvenance.Configured:
      return t('traces-to-logs.provenance-configured', 'Configured on the Tempo data source: {{name}}', {
        name: target.datasourceName,
      });
    case LogsLinkProvenance.Correlation:
      return t('traces-to-logs.provenance-correlation', 'From a correlation to {{name}}', {
        name: target.datasourceName,
      });
    default:
      return t(
        'traces-to-logs.provenance-detected',
        'Auto-detected in {{name}}. Trace to logs is not configured on the Tempo data source.',
        { name: target.datasourceName }
      );
  }
}

export function TraceLogsActions({ model }: { model: SceneObject<TraceLogsActionsState> }) {
  const { traceId, logsTarget, logsBounds, logsServiceNames, logsTempoDatasourceUid } = model.useState();
  const styles = useStyles2(getStyles);
  const [canSave, setCanSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isDetected = logsTarget?.provenance === LogsLinkProvenance.Detected;
  const isTempoEditable = logsTempoDatasourceUid ? isDatasourceEditable(logsTempoDatasourceUid) : false;

  useEffect(() => {
    let active = true;

    if (isDetected && isTempoEditable) {
      canWriteDatasources().then((allowed) => {
        if (active) {
          setCanSave(allowed);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [isDetected, isTempoEditable]);

  // usePluginFunctions landed in Grafana 11.6.0 and this app supports 11.5.0, hence the optional call.
  const extensions = usePluginFunctions<ContextForLinksFn>?.({
    extensionPointId: 'grafana-exploretraces-app/get-logs-drilldown-link/v1',
    limitPerPlugin: 1,
  });
  const logsDrilldownFn = extensions?.functions?.[0]?.fn;

  const strategy = logsTarget?.strategyId ? getStrategy(logsTarget.strategyId) : undefined;

  const onSave = useCallback(async () => {
    if (!logsTempoDatasourceUid || !logsTarget || !strategy) {
      return;
    }

    setIsSaving(true);

    try {
      await saveTraceToLogsConfig(logsTempoDatasourceUid, strategy.toTraceToLogsConfig(logsTarget.datasourceUid));
      setIsSaved(true);
      reportAppInteraction(
        USER_EVENTS_PAGES.analyse_traces,
        USER_EVENTS_ACTIONS.analyse_traces.trace_logs_config_saved,
        {
          strategy: logsTarget.strategyId,
        }
      );
    } catch (error) {
      console.error('Failed to save the trace to logs configuration', error);
    } finally {
      setIsSaving(false);
    }
  }, [logsTempoDatasourceUid, logsTarget, strategy]);

  if (!logsTarget || !strategy || !logsBounds || !logsServiceNames?.length) {
    return null;
  }

  const expr = strategy.buildTraceExpr({ traceId, serviceNames: logsServiceNames });
  const drilldownLink = logsDrilldownFn?.({
    targets: [
      {
        refId: TRACE_LOGS_QUERY_REF_ID,
        datasource: { uid: logsTarget.datasourceUid, type: 'loki' },
        expr,
      } as DataQuery,
    ],
    timeRange: toTimeRange(logsBounds),
  });
  const href = drilldownLink?.path ?? buildExploreUrl(logsTarget.datasourceUid, expr, logsBounds);

  return (
    <div className={styles.container}>
      <Tooltip content={getProvenanceLabel(logsTarget)} placement="bottom">
        <LinkButton
          size="sm"
          variant="secondary"
          icon="gf-logs"
          href={href}
          onClick={() =>
            reportAppInteraction(
              USER_EVENTS_PAGES.analyse_traces,
              USER_EVENTS_ACTIONS.analyse_traces.trace_logs_clicked,
              {
                provenance: logsTarget.provenance,
                strategy: logsTarget.strategyId,
              }
            )
          }
        >
          {t('traces-to-logs.trace-link-title', 'Logs for this trace')}
        </LinkButton>
      </Tooltip>

      {canSave && !isSaved && (
        <Tooltip
          content={t(
            'traces-to-logs.save-tooltip',
            'Save this as the trace to logs configuration on the Tempo data source, so everyone in the org gets it without detection. You can refine it in the data source settings afterwards.'
          )}
          placement="bottom"
        >
          <Button size="sm" variant="secondary" fill="text" disabled={isSaving} onClick={onSave}>
            {t('traces-to-logs.save-action', 'Save to data source')}
          </Button>
        </Tooltip>
      )}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  }),
});
