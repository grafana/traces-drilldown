import { countLogLines } from './probe';
import { clearTraceLogsTargetCache, resolveTraceLogsTarget } from './resolveTraceLogsTarget';
import { LogsLinkProvenance } from './types';

jest.mock('./probe');
jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: jest.fn(),
  getCorrelationsService: jest.fn(),
}));

const { getDataSourceSrv, getCorrelationsService } = jest.requireMock('@grafana/runtime');
const mockCountLogLines = countLogLines as jest.MockedFunction<typeof countLogLines>;

const TEMPO_UID = 'tempo-uid';
const bounds = { fromMs: 1_000, toMs: 2_000 };

const lokiA = { uid: 'loki-a', name: 'Loki A', type: 'loki', isDefault: true };
const lokiB = { uid: 'loki-b', name: 'Loki B', type: 'loki', isDefault: false };

interface SetupOptions {
  tempoJsonData?: Record<string, unknown>;
  lokiDatasources?: Array<typeof lokiA>;
  correlationTargets?: Array<{ uid: string; type: string }>;
  missingDatasourceUids?: string[];
}

function setup({
  tempoJsonData = {},
  lokiDatasources = [lokiA, lokiB],
  correlationTargets = [],
  missingDatasourceUids = [],
}: SetupOptions = {}) {
  const byUid = new Map<string, unknown>([
    [TEMPO_UID, { uid: TEMPO_UID, name: 'Tempo', type: 'tempo', jsonData: tempoJsonData }],
    ...lokiDatasources.map((ds) => [ds.uid, ds] as [string, unknown]),
  ]);

  getDataSourceSrv.mockReturnValue({
    getInstanceSettings: (uid: string) => (missingDatasourceUids.includes(uid) ? undefined : byUid.get(uid)),
    getList: () => lokiDatasources,
  });

  getCorrelationsService.mockReturnValue({
    getCorrelationsBySourceUIDs: jest.fn().mockResolvedValue({
      correlations: correlationTargets.map((target, index) => ({
        uid: `correlation-${index}`,
        type: 'query',
        target,
      })),
    }),
  });
}

function resolve() {
  return resolveTraceLogsTarget({
    tempoDatasourceUid: TEMPO_UID,
    traceId: 'trace-1',
    serviceNames: ['checkout'],
    bounds,
  });
}

describe('resolveTraceLogsTarget', () => {
  beforeEach(() => {
    clearTraceLogsTargetCache();
    jest.clearAllMocks();
    mockCountLogLines.mockResolvedValue(0);
  });

  it('returns nothing when the trace has no services to scope a query with', async () => {
    setup();

    await expect(
      resolveTraceLogsTarget({ tempoDatasourceUid: TEMPO_UID, traceId: 'trace-1', serviceNames: [], bounds })
    ).resolves.toBeUndefined();
    expect(mockCountLogLines).not.toHaveBeenCalled();
  });

  describe('layer 1, an explicit tracesToLogsV2 configuration', () => {
    it('wins over discovery and never has links added on top of core', async () => {
      setup({ tempoJsonData: { tracesToLogsV2: { datasourceUid: lokiB.uid } } });
      mockCountLogLines.mockResolvedValue(1);

      const target = await resolve();

      expect(target).toMatchObject({
        datasourceUid: lokiB.uid,
        provenance: LogsLinkProvenance.Configured,
        ownsSpanLinks: false,
      });
      expect(mockCountLogLines).toHaveBeenCalledTimes(1);
      expect(mockCountLogLines).toHaveBeenCalledWith(lokiB.uid, expect.any(String), bounds);
    });

    it('honours the pre v2 configuration shape', async () => {
      setup({ tempoJsonData: { tracesToLogs: { datasourceUid: lokiB.uid } } });

      await expect(resolve()).resolves.toMatchObject({ provenance: LogsLinkProvenance.Configured });
    });

    it('offers no query of its own when configured against a non Loki backend', async () => {
      setup({
        tempoJsonData: { tracesToLogsV2: { datasourceUid: 'splunk-uid' } },
        lokiDatasources: [{ ...lokiA, uid: 'splunk-uid', name: 'Splunk', type: 'grafana-splunk-datasource' }],
      });

      const target = await resolve();

      expect(target).toMatchObject({ provenance: LogsLinkProvenance.Configured, ownsSpanLinks: false });
      expect(target?.strategyId).toBeUndefined();
      expect(mockCountLogLines).not.toHaveBeenCalled();
    });

    it('falls through to discovery when the configured data source is gone', async () => {
      setup({
        tempoJsonData: { tracesToLogsV2: { datasourceUid: 'deleted-uid' } },
        missingDatasourceUids: ['deleted-uid'],
      });
      mockCountLogLines.mockResolvedValue(1);

      await expect(resolve()).resolves.toMatchObject({
        datasourceUid: lokiA.uid,
        provenance: LogsLinkProvenance.Detected,
        ownsSpanLinks: true,
      });
    });
  });

  describe('layers 2 and 3, correlations then discovery', () => {
    it('prefers a correlated data source over the default one', async () => {
      setup({ correlationTargets: [{ uid: lokiB.uid, type: 'loki' }] });
      mockCountLogLines.mockImplementation(async (uid) => (uid === lokiB.uid ? 1 : 0));

      await expect(resolve()).resolves.toMatchObject({
        datasourceUid: lokiB.uid,
        provenance: LogsLinkProvenance.Correlation,
        ownsSpanLinks: true,
      });
    });

    it('keeps the first query shape that actually returns log lines', async () => {
      setup({ lokiDatasources: [lokiA] });
      mockCountLogLines.mockImplementation(async (_uid, expr) => (expr.includes('| json | traceid=') ? 1 : 0));

      await expect(resolve()).resolves.toMatchObject({
        datasourceUid: lokiA.uid,
        strategyId: 'otlp-gateway-json',
        provenance: LogsLinkProvenance.Detected,
      });
    });

    it('shows nothing when no data source has logs for the trace', async () => {
      setup();

      await expect(resolve()).resolves.toBeUndefined();
    });

    it('survives a correlations lookup that fails', async () => {
      setup();
      getCorrelationsService.mockReturnValue({
        getCorrelationsBySourceUIDs: jest.fn().mockRejectedValue(new Error('nope')),
      });
      mockCountLogLines.mockResolvedValue(1);

      await expect(resolve()).resolves.toMatchObject({ provenance: LogsLinkProvenance.Detected });
    });
  });

  it('probes once per trace and shares the result', async () => {
    setup({ lokiDatasources: [lokiA] });
    mockCountLogLines.mockResolvedValue(1);

    const [first, second] = await Promise.all([resolve(), resolve()]);

    expect(first).toBe(second);
    expect(mockCountLogLines).toHaveBeenCalledTimes(1);
  });
});
