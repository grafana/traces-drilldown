import { config, getBackendSrv, getDataSourceSrv } from '@grafana/runtime';

import { TraceToLogsConfig } from './strategies';

interface DatasourcePayload {
  jsonData?: Record<string, unknown>;
  readOnly?: boolean;
}

let permissionCheck: Promise<boolean> | undefined;

/**
 * Whether the current user may persist the detected configuration onto the Tempo data source.
 *
 * Uses the fine grained permission rather than the org role, so an Editor who has been granted
 * `datasources:write` through RBAC still gets the action.
 */
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

/**
 * Provisioned data sources, which is how Grafana Cloud manages the stack's own Tempo instance in
 * many setups, reject writes. There is no point offering the action for them.
 */
export function isDatasourceEditable(datasourceUid: string): boolean {
  return !getDataSourceSrv().getInstanceSettings(datasourceUid)?.readOnly;
}

/**
 * Promote a detected shape into `tracesToLogsV2` on the Tempo data source, so that every user in
 * the org gets the deterministic, config driven path instead of per view detection.
 */
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
