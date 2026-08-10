import { DataSourceInstanceSettings } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';

export interface CandidateDatasource {
  uid: string;
  name: string;
}

/**
 * Instances with more Loki data sources than this should use Logs Drilldown or Explore rather than
 * have us fan out probes across all of them. Same cap metrics-drilldown uses.
 */
export const MAX_LOKI_DATASOURCES_TO_PROBE = 5;

/**
 * Loki data sources worth probing, most likely first.
 *
 * `preferredUids` are data sources a Correlation already points at, so they jump the queue ahead of
 * the default data source.
 */
export function getCandidateLokiDatasources(preferredUids: string[] = []): CandidateDatasource[] {
  const preferred = new Set(preferredUids);

  const all: DataSourceInstanceSettings[] = getDataSourceSrv().getList({
    logs: true,
    type: 'loki',
    filter: (ds) => ds.uid !== 'grafana',
  });

  const rank = (ds: DataSourceInstanceSettings) => {
    if (preferred.has(ds.uid)) {
      return 0;
    }
    if (ds.isDefault) {
      return 1;
    }
    return 2;
  };

  return [...all]
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, MAX_LOKI_DATASOURCES_TO_PROBE)
    .map(({ uid, name }) => ({ uid, name }));
}
