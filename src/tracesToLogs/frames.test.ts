import { DataFrame, FieldType } from '@grafana/data';

import { getTraceServiceNames, getTraceTimeBoundsMs, TRACE_BOUNDS_PADDING_MS } from './frames';

function traceFrame(spans: Array<{ serviceName: string; startTime: number; duration: number }>): DataFrame {
  return {
    name: 'Trace',
    length: spans.length,
    fields: [
      { name: 'serviceName', type: FieldType.string, config: {}, values: spans.map((s) => s.serviceName) },
      { name: 'startTime', type: FieldType.number, config: {}, values: spans.map((s) => s.startTime) },
      { name: 'duration', type: FieldType.number, config: {}, values: spans.map((s) => s.duration) },
    ],
  };
}

const fallback = { fromMs: 1_000, toMs: 2_000 };

describe('getTraceServiceNames', () => {
  it('returns the distinct services taking part in the trace', () => {
    const frame = traceFrame([
      { serviceName: 'checkout', startTime: 1, duration: 1 },
      { serviceName: 'cart', startTime: 2, duration: 1 },
      { serviceName: 'checkout', startTime: 3, duration: 1 },
    ]);

    expect(getTraceServiceNames([frame])).toEqual(['checkout', 'cart']);
  });

  it('returns nothing when the frame carries no service name', () => {
    expect(getTraceServiceNames([{ name: 'x', length: 0, fields: [] }])).toEqual([]);
  });
});

describe('getTraceTimeBoundsMs', () => {
  it('derives a padded window from the trace itself rather than the time picker', () => {
    const frame = traceFrame([
      { serviceName: 'checkout', startTime: 1_700_000_000_000, duration: 250 },
      { serviceName: 'cart', startTime: 1_700_000_000_100, duration: 500 },
    ]);

    expect(getTraceTimeBoundsMs([frame], fallback)).toEqual({
      fromMs: 1_700_000_000_000 - TRACE_BOUNDS_PADDING_MS,
      toMs: 1_700_000_000_600 + TRACE_BOUNDS_PADDING_MS,
    });
  });

  it('falls back to the given bounds when the frame has no usable timestamps', () => {
    expect(getTraceTimeBoundsMs([{ name: 'x', length: 0, fields: [] }], fallback)).toEqual(fallback);
  });

  it('falls back rather than producing an absurd window', () => {
    const frame = traceFrame([
      { serviceName: 'checkout', startTime: 1_700_000_000_000, duration: 0 },
      { serviceName: 'cart', startTime: 1_700_000_000_000 + 48 * 60 * 60 * 1000, duration: 0 },
    ]);

    expect(getTraceTimeBoundsMs([frame], fallback)).toEqual(fallback);
  });
});
