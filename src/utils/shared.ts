import { BusEventWithPayload, DataFrame } from '@grafana/data';
import pluginJson from '../plugin.json';

export type MetricFunction = 'rate' | 'errors' | 'duration';

export enum ROUTES {
  Explore = 'explore',
  Home = 'home',
}

export const PLUGIN_ID = pluginJson.id;
export const PLUGIN_BASE_URL = `/a/${PLUGIN_ID}`;
export const EXPLORATIONS_ROUTE = `${PLUGIN_BASE_URL}/${ROUTES.Explore}`;

export const DATASOURCE_LS_KEY = 'grafana.drilldown.traces.datasource';
export const HOMEPAGE_FILTERS_LS_KEY = 'grafana.drilldown.traces.homepage.filters';
export const BOOKMARKS_LS_KEY = 'grafana.drilldown.traces.bookmarks';
export const GROUP_BY_CLICK_COUNTS_STORAGE_KEY = 'grafana.drilldown.traces.groupByClickCounts';

export const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fit, minmax(400px, 1fr))';

export const EMPTY_STATE_ERROR_MESSAGE = 'No data for selected query';
export const EMPTY_STATE_ERROR_REMEDY_MESSAGE = 'Please try removing some filters or changing your query.';

export const FILTER_SEPARATOR = ' && ';

export const VAR_DATASOURCE = 'ds';
export const VAR_DATASOURCE_EXPR = '${ds}';
export const VAR_PRIMARY_SIGNAL = 'primarySignal';
export const VAR_FILTERS = 'filters';
export const VAR_FILTERS_EXPR = '${primarySignal} && ${filters}';
export const VAR_HOME_FILTER = 'homeFilter';
export const VAR_GROUPBY = 'groupBy';
export const VAR_SPAN_LIST_COLUMNS = 'spanListColumns';
export const VAR_METRIC = 'metric';
export const VAR_LATENCY_THRESHOLD = 'latencyThreshold';
export const VAR_LATENCY_THRESHOLD_EXPR = '${latencyThreshold}';
export const VAR_LATENCY_PARTIAL_THRESHOLD = 'partialLatencyThreshold';
export const VAR_LATENCY_PARTIAL_THRESHOLD_EXPR = '${partialLatencyThreshold}';
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

export const radioAttributesResource = [
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
export const radioAttributesSpan = [
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
export const ignoredAttributesHomeFilter = [
  'status',
  'span:status',
  'rootName',
  'rootService',
  'rootServiceName',
  'trace:rootName',
  'trace:rootService',
  'trace:rootServiceName',
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

export interface EventTimeseriesDataReceivedPayload {
  series?: DataFrame[];
}

export class EventTimeseriesDataReceived extends BusEventWithPayload<EventTimeseriesDataReceivedPayload> {
  public static type = 'timeseries-data-received';
}
export interface EventTraceOpenedPayload {
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
