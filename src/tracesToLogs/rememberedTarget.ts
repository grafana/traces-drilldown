import { LogsStrategyId } from './types';

const STORAGE_KEY = 'grafana.drilldown.traces.logsTarget';

export interface RememberedTarget {
  datasourceUid: string;
  strategyId: LogsStrategyId;
}

type Store = Record<string, RememberedTarget>;

function read(): Store {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

/**
 * The data source and shape that worked last time for this Tempo data source.
 *
 * Probing every shape against every candidate is what makes ad-hoc resolution expensive. Trying
 * the remembered pair first turns the steady state into a single query per trace, which is the
 * count gate we need anyway. A stale pair simply misses and full probing resumes, so a change in
 * how logs are shipped heals itself.
 */
export function getRememberedTarget(tempoDatasourceUid: string): RememberedTarget | undefined {
  return read()[tempoDatasourceUid];
}

export function rememberTarget(tempoDatasourceUid: string, target: RememberedTarget) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ ...read(), [tempoDatasourceUid]: target }));
  } catch {
    // Storage is best effort; resolution works without it.
  }
}

export function clearRememberedTargets() {
  try {
    window.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
