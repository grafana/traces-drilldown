import { DataSourceInstanceSettings } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';

export interface CandidateDatasource {
  uid: string;
  name: string;
}

/** Same cap metrics-drilldown uses; beyond this, Logs Drilldown or Explore is the better tool. */
export const MAX_LOKI_DATASOURCES_TO_PROBE = 5;

/** Default data source first, then by name. */
export function getCandidateLokiDatasources(): CandidateDatasource[] {
  const all: DataSourceInstanceSettings[] = getDataSourceSrv().getList({
    logs: true,
    type: 'loki',
    filter: (ds) => ds.uid !== 'grafana',
  });

  const rank = (ds: DataSourceInstanceSettings) => (ds.isDefault ? 0 : 1);

  return [...all]
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, MAX_LOKI_DATASOURCES_TO_PROBE)
    .map(({ uid, name }) => ({ uid, name }));
}
