import { locationUtil } from '@grafana/data';
import {
  getWebInstrumentations,
  initializeFaro,
  TransportItemType,
  type EventEvent,
  type TraceEvent,
  type TransportItem,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

import { FARO_ENVIRONMENTS, getEnvironment, getFaroEnvironment, resolveEnvironmentFromHost } from './environments';
import { ignoreErrorPatterns, initFaro, scrubPageUrl, setFaro } from './faro';

jest.mock('@grafana/faro-web-sdk');
jest.mock('@grafana/faro-web-tracing', () => ({ TracingInstrumentation: jest.fn() }));

jest.mock('./environments', () => {
  const actual = jest.requireActual('./environments') as typeof import('./environments');
  return {
    ...actual,
    getFaroEnvironment: jest.fn((...args: Parameters<typeof actual.getFaroEnvironment>) =>
      actual.getFaroEnvironment(...args)
    ),
  };
});

const mockedGetFaroEnvironment = getFaroEnvironment as jest.MockedFunction<typeof getFaroEnvironment>;
const initializeFaroMock = initializeFaro as jest.MockedFunction<typeof initializeFaro>;
const getWebInstrumentationsMock = getWebInstrumentations as jest.MockedFunction<typeof getWebInstrumentations>;

const PROD_URL = 'https://example.com/collect-prod';

describe('resolveEnvironmentFromHost()', () => {
  test.each([
    [undefined, null],
    ['', null],
    ['localhost', 'local'],
    ['localhost:3000', 'local'],
    ['127.0.0.1', 'local'],
    ['grafana-dev.net', 'dev'],
    ['test.grafana-ops.net', 'ops'],
    ['foobar.grafana.net', 'prod'],
    ['my.example.com', null],
  ])('when the host is %s → %s', (host, expectedEnvironment) => {
    expect(resolveEnvironmentFromHost(host)).toBe(expectedEnvironment);
  });
});

describe('getEnvironment()', () => {
  test('delegates to window.location.host (jsdom default is localhost)', () => {
    expect(getEnvironment()).toBe('local');
  });
});

describe('getFaroEnvironment()', () => {
  beforeEach(() => {
    mockedGetFaroEnvironment.mockImplementation(
      (jest.requireActual('./environments') as typeof import('./environments')).getFaroEnvironment
    );
  });

  test('returns undefined for local when local Faro env is not configured', () => {
    expect(getFaroEnvironment()).toBeUndefined();
  });

  test('cloud environments have collect URLs configured', () => {
    expect(FARO_ENVIRONMENTS.get('dev')?.faroUrl).toMatch(/\/collect\/[a-f0-9]+$/);
    expect(FARO_ENVIRONMENTS.get('ops')?.faroUrl).toMatch(/\/collect\/[a-f0-9]+$/);
    expect(FARO_ENVIRONMENTS.get('prod')?.faroUrl).toMatch(/\/collect\/[a-f0-9]+$/);
  });
});

describe('scrubPageUrl()', () => {
  test('strips query and hash', () => {
    expect(scrubPageUrl('https://grafana.net/a/grafana-exploretraces-app/explore?traceId=abc#x')).toBe(
      'https://grafana.net/a/grafana-exploretraces-app/explore'
    );
  });
});

describe('initFaro()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setFaro(null);
    initializeFaroMock.mockReturnValue({
      api: { pushLog: jest.fn() },
    } as never);
    getWebInstrumentationsMock.mockReturnValue([{} as never]);
    mockedGetFaroEnvironment.mockReturnValue({
      environment: 'prod',
      faroUrl: PROD_URL,
      appName: 'grafana-exploretraces-app-prod',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setFaro(null);
  });

  test('does not initialize Faro when environment is unavailable', async () => {
    mockedGetFaroEnvironment.mockReturnValue(undefined);

    await initFaro();

    expect(initializeFaro).not.toHaveBeenCalled();
    expect(TracingInstrumentation).not.toHaveBeenCalled();
  });

  test('initializes Faro with production-safe configuration', async () => {
    mockedGetFaroEnvironment.mockReturnValue({
      environment: 'prod',
      faroUrl: PROD_URL,
      appName: 'grafana-exploretraces-app-prod',
    });

    await initFaro();

    const lastCall = initializeFaroMock.mock.lastCall;
    if (lastCall == null) {
      throw new Error('expected initializeFaro to have been called');
    }

    const { app, user, instrumentations, isolate, beforeSend, ignoreErrors, url } = lastCall[0];

    expect(url).toBe(PROD_URL);
    expect(app).toEqual(
      expect.objectContaining({
        name: 'grafana-exploretraces-app-prod',
        environment: 'prod',
        version: expect.any(String),
      })
    );
    expect(user).toBeUndefined();
    expect(ignoreErrors).toBe(ignoreErrorPatterns);
    expect(isolate).toBe(true);
    expect(getWebInstrumentations).toHaveBeenCalledWith({ captureConsole: false });
    expect(instrumentations).toHaveLength(2);
    expect(instrumentations?.[0]).toEqual({});
    expect(instrumentations?.[1]).toBeInstanceOf(TracingInstrumentation);
    expect(beforeSend).toBeInstanceOf(Function);

    const meta = Object.freeze({
      page: { url: 'https://grafana.net/a/grafana-exploretraces-app/explore?traceId=secret' },
    });
    const kept = beforeSend!({ meta } as never);
    expect(kept?.meta.page?.url).toBe('https://grafana.net/a/grafana-exploretraces-app/explore');
    expect(meta.page.url).toBe('https://grafana.net/a/grafana-exploretraces-app/explore?traceId=secret');

    const dropped = beforeSend!({
      meta: { page: { url: 'https://grafana.net/explore' } },
    } as never);
    expect(dropped).toBeNull();
  });

  test('initializes Faro only once', async () => {
    mockedGetFaroEnvironment.mockReturnValue({
      environment: 'prod',
      faroUrl: PROD_URL,
      appName: 'grafana-exploretraces-app-prod',
    });

    await initFaro();
    await initFaro();

    expect(initializeFaro).toHaveBeenCalledTimes(1);
    expect(TracingInstrumentation).toHaveBeenCalledTimes(1);
  });

  test('should route only the plugin root and its descendants', async () => {
    const pluginPaths = [
      '/a/grafana-exploretraces-app',
      '/a/grafana-exploretraces-app/',
      '/a/grafana-exploretraces-app/explore',
    ];
    const unrelatedPaths = [
      '/explore',
      '/a/another-plugin',
      '/a/grafana-exploretraces-app-other',
      '/other/a/grafana-exploretraces-app',
    ];

    await initFaro();
    const matcher = jest.mocked(TracingInstrumentation).mock.calls[0][0]!.pageRouteMatchers![0].pattern as RegExp;
    const matchedPluginPaths = pluginPaths.map((path) => matcher.test(path));
    const matchedUnrelatedPaths = unrelatedPaths.map((path) => matcher.test(path));

    expect(TracingInstrumentation).toHaveBeenCalledWith({
      mode: 'routing',
      pageRouteMatchers: [{ pattern: /^\/a\/grafana-exploretraces-app(?:\/|$)/, target: 'pathname' }],
    });
    expect(matchedPluginPaths).toEqual([true, true, true]);
    expect(matchedUnrelatedPaths).toEqual([false, false, false, false]);
  });

  test('should report initialization failures without throwing', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    initializeFaroMock.mockImplementationOnce(() => {
      throw new Error('initialization failed');
    });

    try {
      await initFaro();

      expect(errorLog).toHaveBeenCalledWith('Failed to initialize Faro', new Error('initialization failed'));
    } finally {
      errorLog.mockRestore();
    }
  });

  function deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    for (const child of Object.values(value)) {
      deepFreeze(child);
    }

    Object.freeze(value);
    return value;
  }

  async function send(payload: TraceEvent | EventEvent, type: TransportItemType, pageUrl?: string) {
    await initFaro();

    const lastCall = initializeFaroMock.mock.lastCall;
    if (lastCall == null) {
      throw new Error('expected initializeFaro to have been called');
    }

    const { beforeSend } = lastCall[0];
    const url = pageUrl ?? 'https://grafana.net/a/grafana-exploretraces-app/explore?traceId=secret';

    return beforeSend!(deepFreeze({ type, payload, meta: { page: { url } } } satisfies TransportItem));
  }

  test('should route and send telemetry for the plugin under a Grafana subpath', async () => {
    jest.spyOn(locationUtil, 'assureBaseUrl').mockReturnValue('/grafana/a/grafana-exploretraces-app');
    const payload = { name: 'custom', timestamp: '2026-01-01' };
    const pageUrl = 'https://grafana.net/grafana/a/grafana-exploretraces-app/explore?traceId=secret';

    const result = await send(payload, TransportItemType.EVENT, pageUrl);

    expect(locationUtil.assureBaseUrl).toHaveBeenCalledWith('/a/grafana-exploretraces-app');
    expect(TracingInstrumentation).toHaveBeenCalledWith({
      mode: 'routing',
      pageRouteMatchers: [{ pattern: /^\/grafana\/a\/grafana-exploretraces-app(?:\/|$)/, target: 'pathname' }],
    });
    expect(result?.meta.page?.url).toBe('https://grafana.net/grafana/a/grafana-exploretraces-app/explore');
  });

  test('should treat a dot in the Grafana subpath as literal', async () => {
    jest.spyOn(locationUtil, 'assureBaseUrl').mockReturnValue('/grafana.prod/a/grafana-exploretraces-app');
    const payload = { name: 'custom', timestamp: '2026-01-01' };

    const matching = await send(
      payload,
      TransportItemType.EVENT,
      'https://grafana.net/grafana.prod/a/grafana-exploretraces-app/explore'
    );

    const lookalike = await send(
      payload,
      TransportItemType.EVENT,
      'https://grafana.net/grafanaxprod/a/grafana-exploretraces-app/explore'
    );

    expect(TracingInstrumentation).toHaveBeenCalledWith({
      mode: 'routing',
      pageRouteMatchers: [{ pattern: /^\/grafana\.prod\/a\/grafana-exploretraces-app(?:\/|$)/, target: 'pathname' }],
    });
    expect(matching?.meta.page?.url).toBe('https://grafana.net/grafana.prod/a/grafana-exploretraces-app/explore');
    expect(lookalike).toBeNull();
  });

  test('should drop telemetry when only the query string contains the plugin path', async () => {
    const payload = { name: 'custom', timestamp: '2026-01-01' };
    const pageUrl = 'https://grafana.net/explore?next=/a/grafana-exploretraces-app';

    const result = await send(payload, TransportItemType.EVENT, pageUrl);

    expect(result).toBeNull();
  });

  test('should sanitize URL attributes across trace spans and preserve correlation', async () => {
    const payload = {
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 'browser-trace',
                  spanId: 'browser-span',
                  attributes: [
                    {
                      key: 'http.url',
                      value: { stringValue: 'https://user:password@grafana.net/api/search?q=secret#hidden' }, // trufflehog:ignore
                    },
                    { key: 'url.query', value: { stringValue: 'q=secret' } },
                    { key: 'url.fragment', value: { stringValue: 'hidden' } },
                    { key: 'http.status_code', value: { intValue: 200 } },
                  ],
                },
                {
                  attributes: [
                    { key: 'url.full', value: { stringValue: 'https://grafana.net/api/query?secret=yes#hidden' } },
                    { key: 'http.target', value: { stringValue: '/api/query?secret=yes#hidden' } },
                    { key: 'http.method', value: { stringValue: 'GET' } },
                  ],
                },
                {},
              ],
            },
          ],
        },
      ],
    };

    const item = await send(payload as TraceEvent, TransportItemType.TRACE);
    const trace = item?.payload as TraceEvent | undefined;

    expect(trace?.resourceSpans?.[0].scopeSpans?.[0].spans).toEqual([
      {
        traceId: 'browser-trace',
        spanId: 'browser-span',
        attributes: [
          { key: 'http.url', value: { stringValue: 'https://grafana.net/api/search' } },
          { key: 'http.status_code', value: { intValue: 200 } },
        ],
      },
      {
        attributes: [
          { key: 'url.full', value: { stringValue: 'https://grafana.net/api/query' } },
          { key: 'http.target', value: { stringValue: '/api/query' } },
          { key: 'http.method', value: { stringValue: 'GET' } },
        ],
      },
      {},
    ]);
  });

  test('should sanitize generated HTTP events without losing timings or correlation', async () => {
    const payload: EventEvent = {
      name: 'faro.tracing.fetch',
      timestamp: '2026-01-01',
      trace: { trace_id: 'browser-trace', span_id: 'browser-span' },
      attributes: {
        'http.url': 'https://user:password@grafana.net/api/query?q=secret#hidden', // trufflehog:ignore
        'url.full': 'https://grafana.net/api/query?q=secret#hidden',
        'http.target': '/api/query?q=secret#hidden',
        'url.query': 'q=secret',
        'url.fragment': 'hidden',
        'http.method': 'GET',
        'http.status_code': '200',
        duration_ns: '100',
      },
    };

    const item = await send(payload, TransportItemType.EVENT);

    expect(item?.payload).toEqual({
      name: 'faro.tracing.fetch',
      timestamp: '2026-01-01',
      trace: { trace_id: 'browser-trace', span_id: 'browser-span' },
      attributes: {
        'http.url': 'https://grafana.net/api/query',
        'url.full': 'https://grafana.net/api/query',
        'http.target': '/api/query',
        'http.method': 'GET',
        'http.status_code': '200',
        duration_ns: '100',
      },
    });
  });

  test('should scrub resource event URLs without changing performance resource data or the original payload', async () => {
    const payload = {
      name: 'faro.performance.resource',
      timestamp: '2026-01-01',
      attributes: { name: 'https://grafana.net/api/health?probe=example#test', duration: '70', responseStatus: '200' },
    };

    const item = await send(payload, TransportItemType.EVENT);

    expect(item?.payload).toMatchObject({
      name: 'faro.performance.resource',
      attributes: { name: 'https://grafana.net/api/health', duration: '70', responseStatus: '200' },
    });
  });

  test('should scrub resource event URLs without changing performance navigation data or the original payload', async () => {
    const payload = {
      name: 'faro.performance.navigation',
      timestamp: '2026-01-01',
      attributes: { name: 'https://grafana.net/api/health?probe=example#test', duration: '70', responseStatus: '200' },
    };

    const item = await send(payload, TransportItemType.EVENT);

    expect(item?.payload).toMatchObject({
      name: 'faro.performance.navigation',
      attributes: { name: 'https://grafana.net/api/health', duration: '70', responseStatus: '200' },
    });
  });

  test('should leave unrelated custom event attributes unchanged', async () => {
    const payload = {
      name: 'custom',
      timestamp: '2026-01-01',
      attributes: { 'url.full': '/custom?value=keep', name: '/custom?name=keep' },
    };

    const item = await send(payload, TransportItemType.EVENT);

    expect(item?.payload).toMatchObject({
      attributes: { 'url.full': '/custom?value=keep', name: '/custom?name=keep' },
    });
  });

  test('should accept a trace without resource spans', async () => {
    const payload: TraceEvent = {};

    const item = await send(payload, TransportItemType.TRACE);

    expect(item?.payload).toEqual({});
  });

  test('should accept a trace with missing nested span arrays', async () => {
    const payload = { resourceSpans: [{}, { scopeSpans: [{}] }] } as TraceEvent;

    const item = await send(payload, TransportItemType.TRACE);

    expect(item?.payload).toEqual({ resourceSpans: [{}, { scopeSpans: [{}] }] });
  });

  test('should accept an HTTP event without attributes', async () => {
    const payload = { name: 'faro.tracing.xml-http-request', timestamp: '2026-01-01' };

    const item = await send(payload, TransportItemType.EVENT);

    expect(item?.payload).toEqual({ name: 'faro.tracing.xml-http-request', timestamp: '2026-01-01' });
  });
});
