import { SceneTimeRange } from '@grafana/scenes';
import { locationService } from '@grafana/runtime';

import { EventTraceOpened } from '../../utils/shared';
import { TraceExploration } from './TraceExploration';

describe('opening a trace from the exceptions embed', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates to Traces Drilldown without writing traceId onto the scene', () => {
    const push = jest.spyOn(locationService, 'push').mockImplementation(() => undefined);
    const exploration = new TraceExploration({
      embedded: true,
      initialDS: 'tempo',
      initialMetric: 'errors',
      initialActionView: 'exceptions',
      allowedActionViews: ['exceptions'],
    });
    const deactivate = exploration.activate();

    exploration.publishEvent(new EventTraceOpened({ traceId: 'trace-1', spanId: 'span-1' }), true);

    expect(exploration.state.traceId).toBeUndefined();
    expect(exploration.state.spanId).toBeUndefined();
    expect(push).toHaveBeenCalledWith(expect.stringContaining('traceId=trace-1'));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('spanId=span-1'));
    deactivate();
  });

  it('writes an absolute time range as unix milliseconds', () => {
    const push = jest.spyOn(locationService, 'push').mockImplementation(() => undefined);
    const exploration = new TraceExploration({
      embedded: true,
      initialDS: 'tempo',
      initialMetric: 'errors',
      initialActionView: 'exceptions',
      allowedActionViews: ['exceptions'],
      $timeRange: new SceneTimeRange({
        from: '2026-11-10T08:00:00Z',
        to: '2026-11-10T09:00:00Z',
      }),
    });
    const deactivate = exploration.activate();

    exploration.publishEvent(new EventTraceOpened({ traceId: 'trace-1', spanId: 'span-1' }), true);

    const url = String(push.mock.calls[0]?.[0]);
    const params = new URLSearchParams(url.slice(url.indexOf('?')));
    const from = Number(params.get('from'));
    const to = Number(params.get('to'));
    expect(from).toBe(Date.parse('2026-11-10T08:00:00Z'));
    expect(to).toBeGreaterThan(from);
    deactivate();
  });

  it('keeps the trace on the scene when the exploration has a drawer', () => {
    const push = jest.spyOn(locationService, 'push').mockImplementation(() => undefined);
    const exploration = new TraceExploration({ initialDS: 'tempo' });
    const deactivate = exploration.activate();

    exploration.publishEvent(new EventTraceOpened({ traceId: 'trace-2', spanId: 'span-2' }), true);

    expect(exploration.state.traceId).toBe('trace-2');
    expect(exploration.state.spanId).toBe('span-2');
    expect(push).not.toHaveBeenCalled();
    deactivate();
  });
});
