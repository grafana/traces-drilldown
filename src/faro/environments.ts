export type Environment = 'dev' | 'local' | 'ops' | 'prod';

export type FaroEnvironment = { appName: string; environment: Environment; faroUrl: string };

/**
 * Collector URLs for Grafana Labs Frontend Observability apps
 * (grafana-exploretraces-app-{dev,ops,prod} on the ops stack).
 *
 * Local testing: uncomment the `local` entry (CORS must allow your Grafana origin).
 */
export const FARO_ENVIRONMENTS = new Map<Environment, FaroEnvironment>([
  // Uncomment to send Faro data from local Grafana
  // [
  //   'local',
  //   {
  //     environment: 'local',
  //     appName: 'grafana-exploretraces-app-local',
  //     faroUrl: 'https://faro-collector-ops-eu-south-0.grafana-ops.net/collect/1f3b9e3eeafac553f4cb4bdfa103f657',
  //   },
  // ],
  [
    'dev',
    {
      environment: 'dev',
      appName: 'grafana-exploretraces-app-dev',
      faroUrl: 'https://faro-collector-ops-eu-south-0.grafana-ops.net/collect/0a3bdaa48cd4d43d57c441738ca80e55',
    },
  ],
  [
    'ops',
    {
      environment: 'ops',
      appName: 'grafana-exploretraces-app-ops',
      faroUrl: 'https://faro-collector-ops-eu-south-0.grafana-ops.net/collect/876884309105db1c86f017a027e0542c',
    },
  ],
  [
    'prod',
    {
      environment: 'prod',
      appName: 'grafana-exploretraces-app-prod',
      faroUrl: 'https://faro-collector-ops-eu-south-0.grafana-ops.net/collect/2e5ac318ff0dcf61c1ee9db6077bee83',
    },
  ],
]);

const HOST_MATCHERS: Array<{ environment: Environment; regExp: RegExp }> = [
  { regExp: /^localhost(:\d+)?$/i, environment: 'local' },
  { regExp: /^127\.0\.0\.1(:\d+)?$/i, environment: 'local' },
  { regExp: /(^|\.)grafana-dev\.net(:\d+)?$/i, environment: 'dev' },
  { regExp: /(^|\.)grafana-ops\.net(:\d+)?$/i, environment: 'ops' },
  { regExp: /(^|\.)grafana\.net(:\d+)?$/i, environment: 'prod' },
];

/** Exported for unit tests (Jest cannot reliably replace `window.location`). */
export function resolveEnvironmentFromHost(host: string | undefined | null): Environment | null {
  if (host == null || host === '') {
    return null;
  }

  const found = HOST_MATCHERS.find(({ regExp }) => regExp.test(host));
  return found ? found.environment : null;
}

export function getEnvironment(): Environment | null {
  return resolveEnvironmentFromHost(window?.location?.host);
}

export function getFaroEnvironment(): FaroEnvironment | undefined {
  const environment = getEnvironment();

  if (!environment || !FARO_ENVIRONMENTS.has(environment)) {
    return undefined;
  }

  return FARO_ENVIRONMENTS.get(environment) as FaroEnvironment;
}
