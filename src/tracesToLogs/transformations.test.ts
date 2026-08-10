import { DataFrame, FieldType } from '@grafana/data';
import { lastValueFrom, of } from 'rxjs';

import { addTraceLogsLinksTransformation } from './transformations';
import { LogsLinkProvenance, TraceLogsTarget } from './types';

jest.mock('@grafana/runtime', () => ({
  getCorrelationsService: jest.fn(),
}));

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

    expect(link.title).toBe('Logs for this span');
    expect(link.internal?.datasourceUid).toBe('loki-a');
    expect((link.internal?.query as { expr: string }).expr).toBe(
      '{service_name="${__data.fields.serviceName}"} | trace_id="trace-1"'
    );
  });

  it('adds nothing before a target has been resolved', async () => {
    expect(linksOf(await run(undefined))).toHaveLength(0);
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

  it('preserves links the data source or a correlation already put on the field', async () => {
    const frame = traceFrame();
    frame.fields[0].config.links = [{ title: 'Existing', url: '/somewhere' }];

    const links = linksOf(await run(detectedTarget, [frame]));

    expect(links.map((link) => link.title)).toEqual(['Existing', 'Logs for this span']);
  });
});
