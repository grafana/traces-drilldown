import { DataFrame, FieldType } from '@grafana/data';

import { TimeBoundsMs } from './types';

/** Padding either side of the trace when probing for logs, to absorb ingestion lag and clock skew. */
export const TRACE_BOUNDS_PADDING_MS = 5 * 60 * 1000;

/** Guard against a malformed frame producing an absurd probe window. */
const MAX_TRACE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Keeps the generated service alternation from growing unbounded on very wide traces. */
export const MAX_SERVICE_NAMES = 20;

function getField(frames: DataFrame[], name: string) {
  for (const frame of frames) {
    const field = frame.fields.find((f) => f.name === name);

    if (field) {
      return field;
    }
  }

  return undefined;
}

/** Distinct service names taking part in the trace. */
export function getTraceServiceNames(frames: DataFrame[]): string[] {
  const names = new Set<string>();

  for (const frame of frames) {
    const field = frame.fields.find((f) => f.name === 'serviceName');

    if (!field) {
      continue;
    }

    for (let i = 0; i < field.values.length; i++) {
      const value = field.values[i];

      if (typeof value === 'string' && value !== '') {
        names.add(value);
      }
    }
  }

  return Array.from(names).slice(0, MAX_SERVICE_NAMES);
}

/** Padded window around the trace itself; the time picker can be far wider, which is slow. */
export function getTraceTimeBoundsMs(frames: DataFrame[], fallback: TimeBoundsMs): TimeBoundsMs {
  const startTime = getField(frames, 'startTime');
  const duration = getField(frames, 'duration');

  if (!startTime || startTime.type !== FieldType.number || !startTime.values.length) {
    return fallback;
  }

  let earliest = Number.POSITIVE_INFINITY;
  let latest = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < startTime.values.length; i++) {
    const start = startTime.values[i];

    if (typeof start !== 'number' || !Number.isFinite(start)) {
      continue;
    }

    const spanDuration = typeof duration?.values[i] === 'number' ? duration.values[i] : 0;

    earliest = Math.min(earliest, start);
    latest = Math.max(latest, start + spanDuration);
  }

  if (
    !Number.isFinite(earliest) ||
    !Number.isFinite(latest) ||
    earliest <= 0 ||
    latest - earliest > MAX_TRACE_WINDOW_MS
  ) {
    return fallback;
  }

  return {
    fromMs: Math.floor(earliest - TRACE_BOUNDS_PADDING_MS),
    toMs: Math.ceil(latest + TRACE_BOUNDS_PADDING_MS),
  };
}
