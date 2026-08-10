/** Where the logs target came from. Surfaced to the user so support can reason about it. */
export enum LogsLinkProvenance {
  Configured = 'configured',
  Correlation = 'correlation',
  Detected = 'detected',
}

/** Identifier of a query shape we know how to build and probe. */
export type LogsStrategyId =
  | 'otel-structured-metadata'
  | 'service-parsed'
  | 'otlp-gateway-json'
  | 'job-parsed'
  | 'line-contains';

export interface TraceLogsTarget {
  datasourceUid: string;
  datasourceName: string;
  provenance: LogsLinkProvenance;
  /** Undefined when no shape matched, or the backend is one we cannot build LogQL for. */
  strategyId?: LogsStrategyId;
  /** False when `tracesToLogsV2` already produces span links, so we never add a competing one. */
  ownsSpanLinks: boolean;
  /** False only for a configured non-Loki backend: distinguishes "found nothing" from "could not look". */
  probed: boolean;
  /** Configured, but never filters by trace id, so core's link opens the whole service (#779). */
  configMissingTraceFilter?: boolean;
}

export interface TraceLogsContext {
  traceId: string;
  serviceNames: string[];
}

export interface TimeBoundsMs {
  fromMs: number;
  toMs: number;
}
