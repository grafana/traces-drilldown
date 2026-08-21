import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

import {
  FARO_ENVIRONMENTS,
  getEnvironment,
  getFaroEnvironment,
  resolveEnvironmentFromHost,
} from './environments';
import { ignoreErrorPatterns, initFaro, scrubPageUrl, setFaro } from './faro';

jest.mock('@grafana/faro-web-sdk');

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
  });

  afterEach(() => {
    setFaro(null);
  });

  test('does not initialize Faro when environment is unavailable', async () => {
    mockedGetFaroEnvironment.mockReturnValue(undefined);

    await initFaro();

    expect(initializeFaro).not.toHaveBeenCalled();
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
    expect(instrumentations).toHaveLength(1);
    expect(beforeSend).toBeInstanceOf(Function);

    const kept = beforeSend!({
      meta: { page: { url: 'https://grafana.net/a/grafana-exploretraces-app/explore?traceId=secret' } },
    } as never);
    expect(kept?.meta.page?.url).toBe('https://grafana.net/a/grafana-exploretraces-app/explore');

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
  });
});
