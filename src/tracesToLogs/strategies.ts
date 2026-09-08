import { LogsStrategyId, TraceLogsContext } from './types';

/** Escape a value for a LogQL double quoted label matcher. */
export function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Escape a value so it is matched literally inside a LogQL regex matcher. */
export function escapeRegexValue(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

function serviceAlternation(serviceNames: string[]): string {
  return serviceNames.map(escapeRegexValue).join('|');
}

/** Subset of `TraceToLogsOptionsV2`, which lives in a package plugins cannot import. */
export interface TraceToLogsConfig {
  datasourceUid?: string;
  tags?: Array<{ key: string; value?: string }>;
  filterByTraceID?: boolean;
  filterBySpanID?: boolean;
  query?: string;
  customQuery: boolean;
}

export interface LogsStrategy {
  id: LogsStrategyId;
  /** Concrete query for the whole trace: used to probe, and behind the trace-wide action. */
  buildTraceExpr(ctx: TraceLogsContext): string;
  /**
   * Per span row, scoped to that span's service. `${__data.fields.serviceName}` is interpolated by
   * Grafana and, as with core's custom queries, not escaped.
   */
  buildSpanExpr(traceId: string): string;
  /** Equivalent config to persist on the Tempo data source, so the guess becomes authoritative. */
  toTraceToLogsConfig(datasourceUid: string): TraceToLogsConfig;
}

/** `service.name` is `job` in Mimir and `service_name` in Loki. */
const SERVICE_NAME_LABEL = 'service_name';

const otelStructuredMetadata: LogsStrategy = {
  id: 'otel-structured-metadata',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{${SERVICE_NAME_LABEL}=~"${serviceAlternation(serviceNames)}"} | trace_id="${escapeLabelValue(traceId)}"`,
  buildSpanExpr: (traceId) =>
    `{${SERVICE_NAME_LABEL}="\${__data.fields.serviceName}"} | trace_id="${escapeLabelValue(traceId)}"`,
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: false,
    filterByTraceID: true,
    tags: [{ key: 'service.name', value: SERVICE_NAME_LABEL }],
  }),
};

/**
 * Trace id inside the line rather than in structured metadata, e.g.
 * `{"message":"order placed","trace_id":"5cfd..."}`. Both parsers run because the encoding varies
 * by service; the one that fails sets `__error__`, dropped before the filter.
 */
const serviceParsed: LogsStrategy = {
  id: 'service-parsed',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{${SERVICE_NAME_LABEL}=~"${serviceAlternation(
      serviceNames
    )}"} | logfmt | json | drop __error__, __error_details__ | trace_id="${escapeLabelValue(traceId)}"`,
  buildSpanExpr: (traceId) =>
    `{${SERVICE_NAME_LABEL}="\${__data.fields.serviceName}"} | logfmt | json | drop __error__, __error_details__ | trace_id="${escapeLabelValue(
      traceId
    )}"`,
  // Core's `filterByTraceID` also matches the id anywhere in the line, so it covers this shape.
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: false,
    filterByTraceID: true,
    tags: [{ key: 'service.name', value: SERVICE_NAME_LABEL }],
  }),
};

/** Legacy Grafana Cloud OTLP gateway: `traceid` json field, `job` is `namespace/name`. */
const otlpGatewayJson: LogsStrategy = {
  id: 'otlp-gateway-json',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{exporter="OTLP", job=~"(.*/)?(${serviceAlternation(serviceNames)})"} | json | traceid="${escapeLabelValue(
      traceId
    )}"`,
  buildSpanExpr: (traceId) =>
    `{exporter="OTLP", job=~"(.*/)?\${__data.fields.serviceName}"} | json | traceid="${escapeLabelValue(traceId)}"`,
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: true,
    filterByTraceID: false,
    tags: [{ key: 'service.name', value: 'job' }],
    query: '{exporter="OTLP", ${__tags}} | json | traceid="${__span.traceId}"',
  }),
};

/** `job` label, trace id inside the line, logfmt or json. */
const jobParsed: LogsStrategy = {
  id: 'job-parsed',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{job=~"(.*/)?(${serviceAlternation(
      serviceNames
    )})"} | logfmt | json | drop __error__, __error_details__ | trace_id="${escapeLabelValue(traceId)}"`,
  buildSpanExpr: (traceId) =>
    `{job=~"(.*/)?\${__data.fields.serviceName}"} | logfmt | json | drop __error__, __error_details__ | trace_id="${escapeLabelValue(
      traceId
    )}"`,
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: true,
    filterByTraceID: false,
    tags: [{ key: 'service.name', value: 'job' }],
    query: '{${__tags}} | logfmt | json | drop __error__, __error_details__ | trace_id="${__span.traceId}"',
  }),
};

/** Last resort: the id is in the line but not parseable out of it. */
const lineContains: LogsStrategy = {
  id: 'line-contains',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{${SERVICE_NAME_LABEL}=~"${serviceAlternation(serviceNames)}"} |= "${escapeLabelValue(traceId)}"`,
  buildSpanExpr: (traceId) =>
    `{${SERVICE_NAME_LABEL}="\${__data.fields.serviceName}"} |= "${escapeLabelValue(traceId)}"`,
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: false,
    filterByTraceID: true,
    tags: [{ key: 'service.name', value: SERVICE_NAME_LABEL }],
  }),
};

/** Probed in order: cheapest and most specific first, broad line scan last. */
export const LOGS_STRATEGIES: LogsStrategy[] = [
  otelStructuredMetadata,
  serviceParsed,
  otlpGatewayJson,
  jobParsed,
  lineContains,
];

export function getStrategy(id: LogsStrategyId): LogsStrategy | undefined {
  return LOGS_STRATEGIES.find((strategy) => strategy.id === id);
}
