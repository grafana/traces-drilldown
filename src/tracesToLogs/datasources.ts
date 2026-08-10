import { DataSourceInstanceSettings } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';

export interface CandidateDatasource {
  uid: string;
  name: string;
}

/** Same cap metrics-drilldown uses; beyond this, Logs Drilldown or Explore is the better tool. */
export const MAX_LOKI_DATASOURCES_TO_PROBE = 5;

/** Most likely first. `preferredUids` (correlation targets) jump ahead of the default. */
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
