import { getCorrelationsService, getDataSourceSrv } from '@grafana/runtime';

import { getCandidateLokiDatasources } from './datasources';
import { countLogLines } from './probe';
import { LOGS_STRATEGIES } from './strategies';
import { LogsLinkProvenance, LogsStrategyId, TimeBoundsMs, TraceLogsContext, TraceLogsTarget } from './types';

interface TraceToLogsOptions {
  datasourceUid?: string;
  filterByTraceID?: boolean;
  filterBySpanID?: boolean;
  customQuery?: boolean;
  query?: string;
}

interface TraceToLogsJsonData {
  tracesToLogsV2?: TraceToLogsOptions;
  /** Pre v2 shape, still honoured by core through `getTraceToLogsOptions`. */
  tracesToLogs?: TraceToLogsOptions;
}

/**
 * Without this, core builds a query from the tag mapping alone, e.g.
 * `{cluster="...", service_name="..."}`, which opens every log line the service ever wrote (#779).
 */
export function configFiltersByTraceId(options: TraceToLogsOptions | undefined): boolean {
  if (!options) {
    return false;
  }

  if (options.filterByTraceID || options.filterBySpanID) {
    return true;
  }

  return Boolean(options.customQuery && /\$\{?__span\.(traceId|spanId)/.test(options.query ?? ''));
}

export interface ResolveTraceLogsTargetParams {
  tempoDatasourceUid: string;
  traceId: string;
  serviceNames: string[];
  bounds: TimeBoundsMs;
}

/** Cached per trace so concurrent callers share one round of probes. */
const cache = new Map<string, Promise<TraceLogsTarget | undefined>>();
const MAX_CACHE_ENTRIES = 50;

export function clearTraceLogsTargetCache() {
  cache.clear();
}

/** The data source an admin has already pointed the Tempo data source at. */
export function getConfiguredTraceToLogs(tempoDatasourceUid: string): TraceToLogsOptions | undefined {
  const jsonData = getDataSourceSrv().getInstanceSettings(tempoDatasourceUid)?.jsonData as
    | TraceToLogsJsonData
    | undefined;
  const options = jsonData?.tracesToLogsV2 ?? jsonData?.tracesToLogs;

  return options?.datasourceUid ? options : undefined;
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

/** Cheapest shape first, stop at the first that returns log lines. */
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
  const configuredOptions = getConfiguredTraceToLogs(tempoDatasourceUid);
  const configuredUid = configuredOptions?.datasourceUid;

  // Layer 1. The configuration decides where the logs are and is never second guessed. Core
  // renders its span links, so we normally only add the trace wide action. The exception is a
  // config that never filters by trace id: there we add a trace-filtered link of our own.
  if (configuredUid) {
    const configured = getDataSourceSrv().getInstanceSettings(configuredUid);

    if (configured) {
      const canProbe = configured.type === 'loki';
      const strategyId = canProbe ? await probeDatasource(configured.uid, context, bounds) : undefined;
      const configMissingTraceFilter = !configFiltersByTraceId(configuredOptions);

      return {
        datasourceUid: configured.uid,
        datasourceName: configured.name,
        provenance: LogsLinkProvenance.Configured,
        strategyId,
        ownsSpanLinks: configMissingTraceFilter && strategyId !== undefined,
        configMissingTraceFilter,
        probed: canProbe,
      };
    }
    // Configured against a data source that no longer exists: fall through to discovery.
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
    probed: true,
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
