import { DataFrame, FieldType } from '@grafana/data';
import { lastValueFrom, of } from 'rxjs';

import { addTraceLogsLinksTransformation } from './transformations';
import { LogsLinkProvenance, TraceLogsTarget } from './types';

const detectedTarget: TraceLogsTarget = {
  datasourceUid: 'loki-a',
  datasourceName: 'Loki A',
  provenance: LogsLinkProvenance.Detected,
  strategyId: 'otel-structured-metadata',
  ownsSpanLinks: true,
};

function traceFrame(): DataFrame {
  return {
    name: 'Trace',
    length: 1,
    fields: [
      { name: 'spanID', type: FieldType.string, config: {}, values: ['span-1'] },
      { name: 'serviceName', type: FieldType.string, config: {}, values: ['checkout'] },
    ],
  };
}

function run(target: TraceLogsTarget | undefined, frames: DataFrame[] = [traceFrame()]) {
  const operator = addTraceLogsLinksTransformation(() => target, 'trace-1')({ interpolate: (value: string) => value });

  return lastValueFrom(of(frames).pipe(operator));
}

function linksOf(frames: DataFrame[]) {
  return frames[0].fields.find((field) => field.name === 'spanID')?.config.links ?? [];
}

describe('addTraceLogsLinksTransformation', () => {
  it('adds a span scoped, trace filtered logs link once a target is resolved', async () => {
    const frames = await run(detectedTarget);
    const [link] = linksOf(frames);

    expect(link.title).toBe('Trace-filtered logs');
    expect(link.internal?.datasourceUid).toBe('loki-a');
    expect((link.internal?.query as { expr: string }).expr).toBe(
      '{service_name="${__data.fields.serviceName}"} | trace_id="trace-1"'
    );
  });

  it('never competes with the links core already renders from the data source configuration', async () => {
    const configured: TraceLogsTarget = {
      ...detectedTarget,
      provenance: LogsLinkProvenance.Configured,
      ownsSpanLinks: false,
    };

    expect(linksOf(await run(configured))).toHaveLength(0);
  });

  it('leaves frames without a service name alone, since the query could not be scoped', async () => {
    const frame: DataFrame = {
      name: 'Trace',
      length: 1,
      fields: [{ name: 'spanID', type: FieldType.string, config: {}, values: ['span-1'] }],
    };

    expect(linksOf(await run(detectedTarget, [frame]))).toHaveLength(0);
  });

  it('keeps the frame identity so open span details are not closed', async () => {
    // Grafana's trace view clears every open span detail when the frame identity changes
    // (useDetailState). Resolution finishes after the trace has rendered, so returning a new frame
    // object here would collapse whatever the user had open.
    const frame = traceFrame();
    const result = await run(detectedTarget, [frame]);

    expect(result[0]).toBe(frame);
    expect(linksOf(result)).toHaveLength(1);
  });

  it('does not add the link twice when the transformation runs again', async () => {
    const frame = traceFrame();

    await run(detectedTarget, [frame]);
    await run(detectedTarget, [frame]);

    expect(linksOf([frame])).toHaveLength(1);
  });

  it('preserves links the data source or a correlation already put on the field', async () => {
    const frame = traceFrame();
    frame.fields[0].config.links = [{ title: 'Existing', url: '/somewhere' }];

    const links = linksOf(await run(detectedTarget, [frame]));

    expect(links.map((link) => link.title)).toEqual(['Existing', 'Trace-filtered logs']);
  });
});
