import type { Faro, TransportItem } from '@grafana/faro-web-sdk';

import packageJson from '../../package.json';
import { PLUGIN_BASE_URL, PLUGIN_ID } from '../utils/shared';
import { getFaroEnvironment } from './environments';

let faro: Faro | null = null;

export const getFaro = () => faro;
export const setFaro = (instance: Faro | null) => {
  faro = instance;
};

/** Browser / extension noise that should not reach Frontend Observability. */
export const ignoreErrorPatterns: Array<string | RegExp> = [
  /^ResizeObserver loop/,
  /^Non-Error exception captured with keys/,
  /^Failed sending payload to the receiver/,
  /chrome-extension:\/\//,
  /moz-extension:\/\//,
  /^Looks like there is an error in the background page/,
  /^cancelled$/,
];

/** Drop query/hash so filters, trace IDs, and other URL state are not sent. */
export function scrubPageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/, 1)[0] ?? url;
  }
}

function beforeSend(event: TransportItem): TransportItem | null {
  const pageUrl = event.meta.page?.url ?? '';
  if (!pageUrl.includes(PLUGIN_BASE_URL)) {
    return null;
  }

  if (event.meta.page) {
    event.meta.page = {
      ...event.meta.page,
      url: scrubPageUrl(pageUrl),
    };
  }

  return event;
}

/**
 * Initialize an isolated Faro instance for Grafana Cloud hosts only.
 * No-op on unknown hosts or while collector URLs are still placeholders.
 */
export async function initFaro() {
  if (getFaro()) {
    return;
  }

  const faroEnvironment = getFaroEnvironment();
  if (!faroEnvironment) {
    return;
  }

  try {
    const { getWebInstrumentations, initializeFaro, LogLevel } = await import('@grafana/faro-web-sdk');

    const { environment, faroUrl, appName } = faroEnvironment;
    const pluginVersion = packageJson.version;

    setFaro(
      initializeFaro({
        url: faroUrl,
        app: {
          name: appName,
          version: pluginVersion,
          environment,
        },
        ignoreErrors: ignoreErrorPatterns,
        instrumentations: [
          ...getWebInstrumentations({
            captureConsole: false,
          }),
        ],
        isolate: true,
        beforeSend,
      })
    );

    getFaro()?.api.pushLog(['Plugin loaded successfully'], {
      level: LogLevel.INFO,
      context: {
        pluginId: PLUGIN_ID,
        appName,
        environment,
        pluginVersion,
      },
    });
  } catch (error) {
    console.error('Failed to initialize Faro', error);
  }
}
