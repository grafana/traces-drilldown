import { getBackendSrv } from '@grafana/runtime';

import { TimeBoundsMs } from './types';

interface DsQueryFrame {
  data?: {
    values?: unknown[][];
  };
}

interface DsQueryResponse {
  results?: Record<string, { frames?: DsQueryFrame[]; error?: string }>;
}

const PROBE_REF_ID = 'tracesToLogsProbe';

/**
 * Ask a Loki data source whether a query returns anything at all, cheaply.
 *
 * This is the query-and-count gate: a link is only worth showing if the target actually has
 * matching data. metrics-drilldown pairs a `getTagKeys`/`getTagValues` existence check with a row
 * count; for a trace id filtered query the count on its own is both cheaper and strictly more
 * accurate, so we only do the count.
 */
export async function countLogLines(datasourceUid: string, expr: string, bounds: TimeBoundsMs): Promise<number> {
  try {
    const response = await getBackendSrv().post<DsQueryResponse>(
      '/api/ds/query',
      {
        from: String(bounds.fromMs),
        to: String(bounds.toMs),
        queries: [
          {
            refId: PROBE_REF_ID,
            datasource: { uid: datasourceUid, type: 'loki' },
            expr,
            queryType: 'range',
            direction: 'backward',
            maxLines: 1,
          },
        ],
      },
      { showErrorAlert: false, showSuccessAlert: false }
    );

    const result = response?.results?.[PROBE_REF_ID];

    if (!result || result.error) {
      return 0;
    }

    return (result.frames ?? []).reduce((count, frame) => count + (frame.data?.values?.[0]?.length ?? 0), 0);
  } catch (error) {
    // A data source that is misconfigured, unreachable or rejects the query simply does not qualify.
    // Probing must never surface an error to the user.
    console.warn('Trace to logs probe failed', { datasourceUid, error });
    return 0;
  }
}
