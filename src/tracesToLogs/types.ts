/**
 * Types for the layered trace-to-logs resolution.
 *
 * Three layers, in strict precedence order:
 *
 * 1. `Configured` — `tracesToLogsV2` on the Tempo data source. Authoritative. Core renders those
 *    span links itself (see `createSpanLinkFactory` in Grafana), so this app never adds its own on
 *    top, it only offers the trace-wide action.
 * 2. `Correlation` — a Grafana Correlation from the Tempo data source to a Loki data source. Used
 *    as a strong hint for *which* Loki data source to query.
 * 3. `Detected` — nothing is configured, so we probe the available Loki data sources and keep the
 *    first shape that actually returns log lines for the trace.
 */

/** Where the logs target came from. Surfaced to the user so support can reason about it. */
export enum LogsLinkProvenance {
  Configured = 'configured',
  Correlation = 'correlation',
  Detected = 'detected',
}

/** Identifier of a query shape we know how to build and probe. */
export type LogsStrategyId = 'otel-structured-metadata' | 'otlp-gateway-json' | 'job-parsed' | 'line-contains';

export interface TraceLogsTarget {
  datasourceUid: string;
  datasourceName: string;
  provenance: LogsLinkProvenance;
  /**
   * The query shape that returned log lines for this trace. Undefined when the Tempo data source is
   * configured against a backend we cannot build LogQL for (Splunk, Elasticsearch, ...) or when no
   * shape matched, in which case we show no links of our own.
   */
  strategyId?: LogsStrategyId;
  /**
   * False when `tracesToLogsV2` already produces span links. We never add a second, competing link
   * to the same span in that case.
   */
  ownsSpanLinks: boolean;
}

/** Everything a strategy needs to build a concrete (non-templated) query for a whole trace. */
export interface TraceLogsContext {
  traceId: string;
  serviceNames: string[];
}

/** Millisecond bounds used for probe queries and for the trace-wide action. */
export interface TimeBoundsMs {
  fromMs: number;
  toMs: number;
}
