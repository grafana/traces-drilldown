import { createDataFrame, FieldType } from '@grafana/data';
import { sceneGraph, SceneObjectBase, SceneObjectState, VizPanel } from '@grafana/scenes';

import { syncYAxis } from './syncYaxis';
import { EventTimeseriesDataReceived } from '../../../utils/shared';

class RootScene extends SceneObjectBase<SceneObjectState> {
  public constructor() {
    super({});
  }
}

function timeseriesFrame(refId: string, name: string, values: number[]) {
  return createDataFrame({
    refId,
    name,
    fields: [
      { name: 'time', type: FieldType.time, values: values.map((_, i) => i) },
      { name: 'val', type: FieldType.number, values },
    ],
  });
}

function makeVizPanel() {
  return {
    clearFieldConfigCache: jest.fn(),
    setState: jest.fn(),
    state: { fieldConfig: {} },
  } as unknown as VizPanel;
}

describe('syncYAxis', () => {
  let findAllSpy: jest.SpyInstance;

  beforeEach(() => {
    findAllSpy = jest.spyOn(sceneGraph, 'findAllObjects');
  });

  afterEach(() => {
    findAllSpy.mockRestore();
  });

  it('uses the max across all frames when every frame shares the same refId (small frame last)', () => {
    const panelA = makeVizPanel();
    const panelB = makeVizPanel();
    findAllSpy.mockReturnValue([panelA, panelB]);

    const root = new RootScene();
    root.activate();
    const cleanup = syncYAxis()(root);

    root.publishEvent(
      new EventTimeseriesDataReceived({
        series: [
          timeseriesFrame('A', 'high', [100, 80]),
          timeseriesFrame('A', 'low', [2, 3]),
        ],
      }),
      true
    );

    expect(panelA.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldConfig: expect.objectContaining({
          defaults: expect.objectContaining({ max: 100 }),
        }),
      })
    );
    expect(panelB.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldConfig: expect.objectContaining({
          defaults: expect.objectContaining({ max: 100 }),
        }),
      })
    );

    cleanup();
  });

  it('includes zero in the max computation', () => {
    const panel = makeVizPanel();
    findAllSpy.mockReturnValue([panel]);

    const root = new RootScene();
    root.activate();
    const cleanup = syncYAxis()(root);

    root.publishEvent(
      new EventTimeseriesDataReceived({
        series: [timeseriesFrame('A', 'only-zeros', [0, 0])],
      }),
      true
    );

    expect(panel.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldConfig: expect.objectContaining({
          defaults: expect.objectContaining({ max: 0 }),
        }),
      })
    );

    cleanup();
  });

  it('does not update panels when there is no finite numeric data', () => {
    const panel = makeVizPanel();
    findAllSpy.mockReturnValue([panel]);

    const root = new RootScene();
    root.activate();
    const cleanup = syncYAxis()(root);

    root.publishEvent(
      new EventTimeseriesDataReceived({
        series: [timeseriesFrame('A', 'empty', [])],
      }),
      true
    );

    expect(panel.setState).not.toHaveBeenCalled();
    cleanup();
  });

  it('does not update panels when all values are NaN', () => {
    const panel = makeVizPanel();
    findAllSpy.mockReturnValue([panel]);

    const root = new RootScene();
    root.activate();
    const cleanup = syncYAxis()(root);

    root.publishEvent(
      new EventTimeseriesDataReceived({
        series: [timeseriesFrame('A', 'all-nan', [NaN, NaN, NaN])],
      }),
      true
    );

    expect(panel.setState).not.toHaveBeenCalled();
    cleanup();
  });

  it('ignores NaN values when computing the max', () => {
    const panel = makeVizPanel();
    findAllSpy.mockReturnValue([panel]);

    const root = new RootScene();
    root.activate();
    const cleanup = syncYAxis()(root);

    root.publishEvent(
      new EventTimeseriesDataReceived({
        series: [timeseriesFrame('A', 'mixed', [NaN, 42, NaN, 10])],
      }),
      true
    );

    expect(panel.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldConfig: expect.objectContaining({
          defaults: expect.objectContaining({ max: 42 }),
        }),
      })
    );

    cleanup();
  });

  it('uses the largest value when all samples are negative', () => {
    const panel = makeVizPanel();
    findAllSpy.mockReturnValue([panel]);

    const root = new RootScene();
    root.activate();
    const cleanup = syncYAxis()(root);

    root.publishEvent(
      new EventTimeseriesDataReceived({
        series: [timeseriesFrame('A', 'negatives', [-10, -5, -20])],
      }),
      true
    );

    expect(panel.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldConfig: expect.objectContaining({
          defaults: expect.objectContaining({ max: -5 }),
        }),
      })
    );

    cleanup();
  });

  it('skips frames with no finite data and uses the max from frames that have data', () => {
    const panel = makeVizPanel();
    findAllSpy.mockReturnValue([panel]);

    const root = new RootScene();
    root.activate();
    const cleanup = syncYAxis()(root);

    root.publishEvent(
      new EventTimeseriesDataReceived({
        series: [
          timeseriesFrame('A', 'empty', []),
          timeseriesFrame('A', 'all-nan', [NaN, NaN]),
          timeseriesFrame('A', 'data', [7, 3]),
        ],
      }),
      true
    );

    expect(panel.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldConfig: expect.objectContaining({
          defaults: expect.objectContaining({ max: 7 }),
        }),
      })
    );

    cleanup();
  });
});
