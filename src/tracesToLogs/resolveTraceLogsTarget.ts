import { getCorrelationsService, getDataSourceSrv } from '@grafana/runtime';

import { getCandidateLokiDatasources } from './datasources';
import { countLogLines } from './probe';
import { LOGS_STRATEGIES } from './strategies';
import { LogsLinkProvenance, LogsStrategyId, TimeBoundsMs, TraceLogsContext, TraceLogsTarget } from './types';

interface TraceToLogsJsonData {
  tracesToLogsV2?: { datasourceUid?: string };
  /** Pre v2 shape, still honoured by core through `getTraceToLogsOptions`. */
  tracesToLogs?: { datasourceUid?: string };
}

export interface ResolveTraceLogsTargetParams {
  tempoDatasourceUid: string;
  traceId: string;
  serviceNames: string[];
  bounds: TimeBoundsMs;
}

/**
 * Resolution is per trace and does not change while the drawer is open, so the promise is cached
 * and concurrent callers share one round of probes.
 */
const cache = new Map<string, Promise<TraceLogsTarget | undefined>>();
const MAX_CACHE_ENTRIES = 50;

export function clearTraceLogsTargetCache() {
  cache.clear();
}

/**
 * The Loki (or other) data source an admin has already pointed the Tempo data source at.
 */
export function getConfiguredLogsDatasourceUid(tempoDatasourceUid: string): string | undefined {
  const jsonData = getDataSourceSrv().getInstanceSettings(tempoDatasourceUid)?.jsonData as
    | TraceToLogsJsonData
    | undefined;

  return jsonData?.tracesToLogsV2?.datasourceUid ?? jsonData?.tracesToLogs?.datasourceUid;
}

/** Loki data sources a Correlation from this Tempo data source already points at. */
async function getCorrelatedLokiUids(tempoDatasourceUid: string): Promise<string[]> {
  try {
    const service = getCorrelationsService?.();

    if (!service) {
      return [];
    }

    const { correlations } = await service.getCorrelationsBySourceUIDs([tempoDatasourceUid]);

    return correlations
      .filter((correlation) => 'target' in correlation && correlation.target?.type === 'loki')
      .map((correlation) => ('target' in correlation ? correlation.target.uid : ''))
      .filter(Boolean);
  } catch (error) {
    console.warn('Failed to load correlations for trace to logs', error);
    return [];
  }
}

/**
 * Try each known query shape against one data source, cheapest first, and stop at the first that
 * returns log lines.
 */
async function probeDatasource(
  datasourceUid: string,
  context: TraceLogsContext,
  bounds: TimeBoundsMs
): Promise<LogsStrategyId | undefined> {
  for (const strategy of LOGS_STRATEGIES) {
    const count = await countLogLines(datasourceUid, strategy.buildTraceExpr(context), bounds);

    if (count > 0) {
      return strategy.id;
    }
  }

  return undefined;
}

async function resolve(params: ResolveTraceLogsTargetParams): Promise<TraceLogsTarget | undefined> {
  const { tempoDatasourceUid, traceId, serviceNames, bounds } = params;

  if (!serviceNames.length) {
    return undefined;
  }

  const context: TraceLogsContext = { traceId, serviceNames };
  const configuredUid = getConfiguredLogsDatasourceUid(tempoDatasourceUid);

  // Layer 1. An explicit configuration always wins and is never second guessed. Core renders the
  // span links for it, so we only work out whether we can also offer the trace wide action.
  if (configuredUid) {
    const configured = getDataSourceSrv().getInstanceSettings(configuredUid);

    if (configured) {
      const strategyId =
        configured.type === 'loki' ? await probeDatasource(configured.uid, context, bounds) : undefined;

      return {
        datasourceUid: configured.uid,
        datasourceName: configured.name,
        provenance: LogsLinkProvenance.Configured,
        strategyId,
        ownsSpanLinks: false,
      };
    }
    // Configured against a data source that no longer exists. Fall through to discovery rather
    // than leaving the user with nothing.
  }

  // Layers 2 and 3. Correlated data sources are probed first, then everything else.
  const correlatedUids = await getCorrelatedLokiUids(tempoDatasourceUid);
  const candidates = getCandidateLokiDatasources(correlatedUids);

  if (!candidates.length) {
    return undefined;
  }

  const probed = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      strategyId: await probeDatasource(candidate.uid, context, bounds),
    }))
  );

  const winner = probed.find((result) => result.strategyId !== undefined);

  if (!winner) {
    return undefined;
  }

  return {
    datasourceUid: winner.candidate.uid,
    datasourceName: winner.candidate.name,
    provenance: correlatedUids.includes(winner.candidate.uid)
      ? LogsLinkProvenance.Correlation
      : LogsLinkProvenance.Detected,
    strategyId: winner.strategyId,
    ownsSpanLinks: true,
  };
}

export function resolveTraceLogsTarget(params: ResolveTraceLogsTargetParams): Promise<TraceLogsTarget | undefined> {
  const key = `${params.tempoDatasourceUid}|${params.traceId}`;
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  if (cache.size >= MAX_CACHE_ENTRIES) {
    cache.clear();
  }

  const pending = resolve(params).catch((error) => {
    console.warn('Failed to resolve a logs target for the trace', error);
    cache.delete(key);
    return undefined;
  });

  cache.set(key, pending);

  return pending;
}
