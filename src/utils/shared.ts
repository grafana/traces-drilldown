import { BusEventWithPayload, DataFrame, MetricFindValue } from '@grafana/data';
import pluginJson from '../plugin.json';
import { AdHocFilterWithLabels } from '@grafana/scenes';

export type MetricFunction = 'rate' | 'errors' | 'duration';

export enum ROUTES {
  Explore = 'explore',
}

export const PLUGIN_ID = pluginJson.id;
export const PLUGIN_BASE_URL = `/a/${PLUGIN_ID}`;
export const EXPLORATIONS_ROUTE = `${PLUGIN_BASE_URL}/${ROUTES.Explore}`;

export const DATASOURCE_LS_KEY = 'grafana.drilldown.traces.datasource';

// Default query range for Time Seeker batches
export const DEFAULT_QUERY_RANGE_HOURS = 24;

export const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export const MIN_PANEL_HEIGHT = '500px';

export const EMPTY_STATE_ERROR_MESSAGE = 'No data for selected query';
export const EMPTY_STATE_ERROR_REMEDY_MESSAGE = 'Please try removing some filters or changing your query.';

export const FILTER_SEPARATOR = ' && ';

export const VAR_DATASOURCE = 'ds';
export const VAR_DATASOURCE_EXPR = '${ds}';
export const VAR_PRIMARY_SIGNAL = 'primarySignal';
export const VAR_FILTERS = 'filters';
export const VAR_FILTERS_EXPR = '${primarySignal} && ${filters}';
export const VAR_GROUPBY = 'groupBy';
export const VAR_SPAN_LIST_COLUMNS = 'spanListColumns';
export const VAR_METRIC = 'metric';
export const VAR_LATENCY_THRESHOLD = 'latencyThreshold';
export const VAR_LATENCY_THRESHOLD_EXPR = '${latencyThreshold}';
export const VAR_LATENCY_PARTIAL_THRESHOLD = 'partialLatencyThreshold';
export const VAR_LATENCY_PARTIAL_THRESHOLD_EXPR = '${partialLatencyThreshold}';
export const VAR_DURATION_PERCENTILES = 'durationPercentiles';
export const VAR_DURATION_PERCENTILES_EXPR = '${durationPercentiles:csv}';
export const explorationDS = { uid: VAR_DATASOURCE_EXPR };

export const ACTION_VIEW = 'actionView';
export const PRIMARY_SIGNAL = 'primarySignal';
export const SELECTION = 'selection';

export const ALL = 'All';
export const RESOURCE = 'Resource';
export const SPAN = 'Span';
export const RESOURCE_ATTR = 'resource.';
export const SPAN_ATTR = 'span.';
export const EVENT_ATTR = 'event.';
export const EVENT_INTRINSIC = 'event:';

export const defaultFavoriteResourceAttributes = [
  // https://opentelemetry.io/docs/specs/semconv/resource/
  'resource.service.name',
  'resource.service.namespace',
  'resource.service.version',
  // custom
  'resource.cluster',
  'resource.environment',
  'resource.namespace',
  // https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
  'resource.deployment.environment',
  // https://opentelemetry.io/docs/specs/semconv/resource/k8s/
  'resource.k8s.namespace.name',
  'resource.k8s.pod.name',
  'resource.k8s.container.name',
  'resource.k8s.node.name',
];
export const defaultFavoriteSpanAttributes = [
  'name',
  'kind',
  'rootName',
  'rootServiceName',
  'status',
  'statusMessage',
  'span.http.status_code',
];
export const ignoredAttributes = [
  'duration',
  'event:name',
  'nestedSetLeft',
  'nestedSetParent',
  'nestedSetRight',
  'span:duration',
  'span:id',
  'trace:duration',
  'trace:id',
  'traceDuration',
];
// Limit maximum options in select dropdowns for performance reasons
export const maxOptions = 1000;

export type MakeOptional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export interface ComparisonSelection {
  type: 'auto' | 'manual';
  raw?: { x: { from: number; to: number }; y: { from: number; to: number } };
  timeRange?: { from: number; to: number };
  duration?: { from: string; to: string };
  query?: string;
}

interface EventTimeseriesDataReceivedPayload {
  series?: DataFrame[];
}

export class EventTimeseriesDataReceived extends BusEventWithPayload<EventTimeseriesDataReceivedPayload> {
  public static type = 'timeseries-data-received';
}
interface EventTraceOpenedPayload {
  traceId: string;
  spanId?: string;
}
export class EventTraceOpened extends BusEventWithPayload<EventTraceOpenedPayload> {
  public static type = 'trace-opened';
}

export const filterStreamingProgressTransformations = [
  {
    id: 'filterByRefId',
    options: {
      exclude: 'streaming-progress',
    },
  },
];

export type LabelValueType = 'quoted' | 'bare' | 'unknown';

export type AdHocFilterWithValueType = AdHocFilterWithLabels<{ valueType: LabelValueType }>;
export type MetricFindValueWithMeta = MetricFindValue & { meta?: { valueType: LabelValueType } };

export const NO_LABELS = 'No labels';

export const ALWAYS_QUOTED_KEYS: ReadonlySet<string> = new Set([
  'span.messaging.destination.partition.id',
  'span.network.protocol.version',
]);
export const ALWAYS_KEYWORD_KEYS: ReadonlySet<string> = new Set(['status', 'kind', 'span:status', 'span:kind']);
export const ALWAYS_DURATION_KEYS: ReadonlySet<string> = new Set([
  'duration',
  'span:duration',
  'trace:duration',
  'event:timeSinceStart',
]);
export const DURATION_REGEX = /^\d+(\.\d+)?$|^(\d+(\.\d+)?(ns|us|µs|ms|s|m|h|d|w|y))+$/;
export const KEYWORD_STATUS_VALUES: ReadonlySet<string> = new Set(['ok', 'error', 'unset']);
export const KEYWORD_KIND_VALUES: ReadonlySet<string> = new Set([
  'unspecified',
  'internal',
  'server',
  'client',
  'producer',
  'consumer',
]);
