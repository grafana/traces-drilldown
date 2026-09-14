import { countLogLines } from './probe';
import { clearTraceLogsTargetCache, resolveTraceLogsTarget } from './resolveTraceLogsTarget';
import { LogsLinkProvenance } from './types';

jest.mock('./probe');
jest.mock('./rememberedTarget');
jest.mock('@grafana/runtime', () => ({ getDataSourceSrv: jest.fn() }));

const { getDataSourceSrv } = jest.requireMock('@grafana/runtime');
const { getRememberedTarget, rememberTarget } = jest.requireMock('./rememberedTarget');
const mockCountLogLines = countLogLines as jest.MockedFunction<typeof countLogLines>;

const TEMPO_UID = 'tempo-uid';
const bounds = { fromMs: 1_000, toMs: 2_000 };

const lokiA = { uid: 'loki-a', name: 'Loki A', type: 'loki', isDefault: true };
const lokiB = { uid: 'loki-b', name: 'Loki B', type: 'loki', isDefault: false };

interface SetupOptions {
  tempoJsonData?: Record<string, unknown>;
  lokiDatasources?: Array<typeof lokiA>;
  missingDatasourceUids?: string[];
}

function setup({
  tempoJsonData = {},
  lokiDatasources = [lokiA, lokiB],
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
    getRememberedTarget.mockReturnValue(undefined);
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
      setup({ tempoJsonData: { tracesToLogsV2: { datasourceUid: lokiB.uid, filterByTraceID: true } } });
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

    it('adds a trace-filtered link of its own when the configuration never filters by trace id', async () => {
      // Reproduces the real world case behind #779: the config points at Loki with only a tag
      // mapping, so core's link opens every log line the service ever wrote.
      setup({ tempoJsonData: { tracesToLogsV2: { datasourceUid: lokiB.uid, customQuery: false } } });
      mockCountLogLines.mockResolvedValue(1);

      await expect(resolve()).resolves.toMatchObject({
        datasourceUid: lokiB.uid,
        provenance: LogsLinkProvenance.Configured,
        configMissingTraceFilter: true,
        ownsSpanLinks: true,
      });
    });

    it('stays out of the way when the configuration does filter by trace id', async () => {
      setup({ tempoJsonData: { tracesToLogsV2: { datasourceUid: lokiB.uid, filterByTraceID: true } } });
      mockCountLogLines.mockResolvedValue(1);

      await expect(resolve()).resolves.toMatchObject({
        ownsSpanLinks: false,
        configMissingTraceFilter: false,
      });
    });

    it('treats a custom query that references the span trace id as filtered', async () => {
      setup({
        tempoJsonData: {
          tracesToLogsV2: {
            datasourceUid: lokiB.uid,
            customQuery: true,
            query: '{service_name="x"} | trace_id="${__span.traceId}"',
          },
        },
      });
      mockCountLogLines.mockResolvedValue(1);

      await expect(resolve()).resolves.toMatchObject({ ownsSpanLinks: false, configMissingTraceFilter: false });
    });

    it('stays out of it entirely when configured against a non Loki backend', async () => {
      setup({
        tempoJsonData: { tracesToLogsV2: { datasourceUid: 'splunk-uid' } },
        lokiDatasources: [{ ...lokiA, uid: 'splunk-uid', name: 'Splunk', type: 'grafana-splunk-datasource' }],
      });

      await expect(resolve()).resolves.toBeUndefined();
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

  describe('discovery', () => {
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
  });

  it('probes once per trace and shares the result', async () => {
    setup({ lokiDatasources: [lokiA] });
    mockCountLogLines.mockResolvedValue(1);

    const [first, second] = await Promise.all([resolve(), resolve()]);

    expect(first).toBe(second);
    expect(mockCountLogLines).toHaveBeenCalledTimes(1);
  });

  describe('remembering what worked', () => {
    it('tries the remembered pair first, so the steady state is one query', async () => {
      setup();
      getRememberedTarget.mockReturnValue({ datasourceUid: lokiB.uid, strategyId: 'line-contains' });
      mockCountLogLines.mockResolvedValue(1);

      await expect(resolve()).resolves.toMatchObject({ datasourceUid: lokiB.uid, strategyId: 'line-contains' });
      expect(mockCountLogLines).toHaveBeenCalledTimes(1);
    });

    it('falls back to full probing when the remembered pair no longer matches', async () => {
      setup({ lokiDatasources: [lokiA] });
      getRememberedTarget.mockReturnValue({ datasourceUid: lokiA.uid, strategyId: 'line-contains' });
      mockCountLogLines.mockImplementation(async (_uid, expr) => (expr.includes('| trace_id=') ? 1 : 0));

      await expect(resolve()).resolves.toMatchObject({ strategyId: 'otel-structured-metadata' });
      expect(rememberTarget).toHaveBeenCalledWith(TEMPO_UID, {
        datasourceUid: lokiA.uid,
        strategyId: 'otel-structured-metadata',
      });
    });
  });
});
