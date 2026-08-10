import { css } from '@emotion/css';
import React, { useCallback, useEffect, useState } from 'react';

import { dateTime, GrafanaTheme2, PluginExtensionLink, TimeRange, urlUtil } from '@grafana/data';
import { t } from '@grafana/i18n';
import { config, usePluginFunctions } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { SceneObject, SceneObjectState } from '@grafana/scenes';
import { Button, LinkButton, Spinner, Tooltip, useStyles2 } from '@grafana/ui';

import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../utils/analytics';
import {
  canWriteDatasources,
  enableTraceIdFilter,
  isDatasourceEditable,
  saveTraceToLogsConfig,
} from './saveTraceToLogsConfig';
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
  /** Distinguishes "still probing" from "probed and found nothing". */
  logsResolution?: 'resolving' | 'done';
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
  if (target.configMissingTraceFilter) {
    return t(
      'traces-to-logs.provenance-configured-unfiltered',
      'The Tempo data source points at {{name}} but does not filter by trace id, so its own span links open the whole service. This link is filtered to this trace.',
      { name: target.datasourceName }
    );
  }

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

/** Why the action is greyed out, so the empty case is explained rather than silent. */
function getUnavailableLabel(isResolving: boolean, target: TraceLogsTarget | undefined): string {
  if (isResolving) {
    return t('traces-to-logs.state-resolving', 'Looking for logs that match this trace');
  }

  if (target?.provenance === LogsLinkProvenance.Configured) {
    return t(
      'traces-to-logs.state-configured-unusable',
      'The Tempo data source sends trace to logs to {{name}}, which this app cannot query directly. Use the links on each span.',
      { name: target.datasourceName }
    );
  }

  return t(
    'traces-to-logs.state-no-logs',
    'No logs matching this trace id were found in the available Loki data sources.'
  );
}

export function TraceLogsActions({ model }: { model: SceneObject<TraceLogsActionsState> }) {
  const { traceId, logsTarget, logsBounds, logsServiceNames, logsTempoDatasourceUid, logsResolution } =
    model.useState();
  const styles = useStyles2(getStyles);
  const [canSave, setCanSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isDetected = logsTarget?.provenance === LogsLinkProvenance.Detected;
  const needsTraceFilterRepair = Boolean(logsTarget?.configMissingTraceFilter);
  const isTempoEditable = logsTempoDatasourceUid ? isDatasourceEditable(logsTempoDatasourceUid) : false;

  useEffect(() => {
    let active = true;

    if ((isDetected || needsTraceFilterRepair) && isTempoEditable) {
      canWriteDatasources().then((allowed) => {
        if (active) {
          setCanSave(allowed);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [isDetected, needsTraceFilterRepair, isTempoEditable]);

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
      if (needsTraceFilterRepair) {
        // Keep the admin's data source and tag mapping, only add the missing trace id filter.
        await enableTraceIdFilter(logsTempoDatasourceUid);
      } else {
        await saveTraceToLogsConfig(logsTempoDatasourceUid, strategy.toTraceToLogsConfig(logsTarget.datasourceUid));
      }
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
  }, [logsTempoDatasourceUid, logsTarget, strategy, needsTraceFilterRepair]);

  // Nothing to say until the trace itself has loaded.
  if (!logsBounds || !logsServiceNames?.length) {
    return null;
  }

  // The action stays on screen in every state. A greyed out button with a reason is more useful
  // than an empty space, which reads as a missing feature rather than as "there are no logs".
  if (!logsTarget || !strategy) {
    const isResolving = logsResolution !== 'done';

    return (
      <div className={styles.container}>
        <Tooltip content={getUnavailableLabel(isResolving, logsTarget)} placement="bottom">
          <span>
            <Button size="sm" variant="secondary" icon={isResolving ? undefined : 'gf-logs'} disabled>
              {isResolving && <Spinner inline size="sm" className={styles.spinner} />}
              {t('traces-to-logs.trace-link-title', 'Logs for this trace')}
            </Button>
          </span>
        </Tooltip>
      </div>
    );
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
          content={
            needsTraceFilterRepair
              ? t(
                  'traces-to-logs.repair-tooltip',
                  'Turn on trace id filtering on the Tempo data source, so its own span links stop opening the whole service. Your data source and tag mapping are left as they are.'
                )
              : t(
                  'traces-to-logs.save-tooltip',
                  'Save this as the trace to logs configuration on the Tempo data source, so everyone in the org gets it without detection. You can refine it in the data source settings afterwards.'
                )
          }
          placement="bottom"
        >
          <Button size="sm" variant="secondary" fill="text" disabled={isSaving} onClick={onSave}>
            {needsTraceFilterRepair
              ? t('traces-to-logs.repair-action', 'Fix data source filter')
              : t('traces-to-logs.save-action', 'Save to data source')}
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
  spinner: css({
    marginRight: theme.spacing(0.5),
  }),
});
