import { config, getBackendSrv, getDataSourceSrv } from '@grafana/runtime';

import { TraceToLogsConfig } from './strategies';

interface DatasourcePayload {
  jsonData?: Record<string, unknown>;
  readOnly?: boolean;
}

let permissionCheck: Promise<boolean> | undefined;

/** Fine grained permission, so an Editor granted `datasources:write` through RBAC still qualifies. */
export function canWriteDatasources(): Promise<boolean> {
  if (!permissionCheck) {
    permissionCheck = getBackendSrv()
      .get<Record<string, unknown>>('/api/access-control/user/permissions', undefined, undefined, {
        showErrorAlert: false,
      })
      .then((permissions) => Boolean(permissions?.['datasources:write']))
      .catch(() => {
        // Older or restricted instances may not expose the endpoint. Fall back to the org role.
        const user = config.bootData?.user;
        return Boolean(user?.isGrafanaAdmin) || user?.orgRole === 'Admin';
      });
  }

  return permissionCheck;
}

/** Provisioned data sources reject writes, so there is no point offering the action. */
export function isDatasourceEditable(datasourceUid: string): boolean {
  return !getDataSourceSrv().getInstanceSettings(datasourceUid)?.readOnly;
}

/** Promote a detected shape into `tracesToLogsV2`, so the whole org gets it without detection. */
export async function saveTraceToLogsConfig(
  tempoDatasourceUid: string,
  traceToLogsConfig: TraceToLogsConfig
): Promise<void> {
  const backend = getBackendSrv();
  const datasource = await backend.get<DatasourcePayload>(`/api/datasources/uid/${tempoDatasourceUid}`);

  await backend.put(`/api/datasources/uid/${tempoDatasourceUid}`, {
    ...datasource,
    jsonData: {
      ...(datasource.jsonData ?? {}),
      tracesToLogsV2: traceToLogsConfig,
    },
  });
}

/** Narrowest repair for a config that opens the whole service: leaves data source and tags alone. */
export async function enableTraceIdFilter(tempoDatasourceUid: string): Promise<void> {
  const backend = getBackendSrv();
  const datasource = await backend.get<DatasourcePayload>(`/api/datasources/uid/${tempoDatasourceUid}`);
  const jsonData = datasource.jsonData ?? {};
  const existing = (jsonData.tracesToLogsV2 ?? jsonData.tracesToLogs ?? {}) as Record<string, unknown>;

  await backend.put(`/api/datasources/uid/${tempoDatasourceUid}`, {
    ...datasource,
    jsonData: {
      ...jsonData,
      tracesToLogsV2: { ...existing, filterByTraceID: true },
    },
  });
}
