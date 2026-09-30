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

/** The query-and-count gate: a link is only worth showing if the target actually has rows. */
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
    // A data source that rejects the query simply does not qualify; never surface this.
    console.warn('Trace to logs probe failed', { datasourceUid, error });
    return 0;
  }
}
