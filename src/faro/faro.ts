import { locationUtil } from '@grafana/data';
import type { EventEvent, Faro, MetaPage, TraceEvent, TransportItem } from '@grafana/faro-web-sdk';
import { escapeRegExp } from 'lodash';

import packageJson from '../../package.json';
import { PLUGIN_BASE_URL, PLUGIN_ID } from '../utils/shared';
import { tryParseUrl } from '../utils/utils';
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

function isRequestUrlAttribute(key: string): boolean {
  return key === 'http.url' || key === 'url.full' || key === 'http.target';
}

function isUrlQueryOrFragment(key: string): boolean {
  return key === 'url.query' || key === 'url.fragment';
}

function scrubRequestAttribute(key: string, value: string): string | undefined {
  if (isUrlQueryOrFragment(key)) {
    return undefined;
  }

  return isRequestUrlAttribute(key) ? scrubPageUrl(value) : value;
}

type TraceScope = NonNullable<TraceEvent['resourceSpans']>[number]['scopeSpans'][number];
type TraceSpan = NonNullable<TraceScope['spans']>[number];

function scrubTraceSpan(span: TraceSpan): TraceSpan {
  const attributes = span.attributes?.flatMap((attribute) => {
    const { key, value } = attribute;
    if (isUrlQueryOrFragment(key)) {
      return [];
    }

    if (!isRequestUrlAttribute(key) || typeof value.stringValue !== 'string') {
      return [attribute];
    }

    const scrubbedValue = { ...value, stringValue: scrubPageUrl(value.stringValue) };
    return [{ ...attribute, value: scrubbedValue }];
  });

  return { ...span, attributes };
}

function scrubTraceUrls(payload: TraceEvent): TraceEvent {
  if (!payload.resourceSpans) {
    return payload;
  }

  return {
    ...payload,
    resourceSpans: payload.resourceSpans.map((resource) => ({
      ...resource,
      scopeSpans: resource.scopeSpans?.map((scope) => ({
        ...scope,
        spans: scope.spans?.map(scrubTraceSpan),
      })),
    })),
  };
}

function scrubEventUrls(payload: EventEvent): EventEvent {
  const { name, attributes } = payload;
  if (!attributes) {
    return payload;
  }

  if (
    (name === 'faro.performance.resource' || name === 'faro.performance.navigation') &&
    typeof attributes.name === 'string'
  ) {
    return { ...payload, attributes: { ...attributes, name: scrubPageUrl(attributes.name) } };
  }

  if (!name.startsWith('faro.tracing.')) {
    return payload;
  }

  const scrubbedAttributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(attributes)) {
    const scrubbed = scrubRequestAttribute(key, value);
    if (scrubbed !== undefined) {
      scrubbedAttributes[key] = scrubbed;
    }
  }

  return { ...payload, attributes: scrubbedAttributes };
}

function getPluginPageRoutePattern(): RegExp {
  const pluginPath = locationUtil.assureBaseUrl(PLUGIN_BASE_URL);
  return new RegExp(`^${escapeRegExp(pluginPath)}(?:/|$)`);
}

function getMetaPageUrl(page?: MetaPage): URL | null {
  if (!page?.url) {
    return null;
  }

  return tryParseUrl(page.url);
}

function beforeSend(event: TransportItem): TransportItem | null {
  const { page } = event.meta;
  const metaPageUrl = getMetaPageUrl(page);
  if (!metaPageUrl || !getPluginPageRoutePattern().test(metaPageUrl.pathname)) {
    return null;
  }

  const scrubbed = {
    ...event,
    meta: { ...event.meta, page: { ...page, url: scrubPageUrl(metaPageUrl.href) } },
  };

  switch (event.type) {
    case 'trace':
      return { ...scrubbed, payload: scrubTraceUrls(event.payload as TraceEvent) };
    case 'event':
      return { ...scrubbed, payload: scrubEventUrls(event.payload as EventEvent) };
    default:
      return scrubbed;
  }
}

/**
 * Initialize an isolated Faro instance for Grafana Cloud hosts only.
 * No-op on unknown hosts or when no Faro environment is configured (e.g. local).
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
    const { TracingInstrumentation } = await import('@grafana/faro-web-tracing');

    const { environment, faroUrl, appName } = faroEnvironment;
    const pluginVersion = packageJson.version;
    const pageRoutePattern = getPluginPageRoutePattern();

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
          new TracingInstrumentation({
            mode: 'routing',
            pageRouteMatchers: [{ pattern: pageRoutePattern, target: 'pathname' }],
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
