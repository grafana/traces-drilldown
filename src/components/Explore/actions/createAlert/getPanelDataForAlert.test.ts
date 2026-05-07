import { sceneGraph, SceneQueryRunner, type VizPanel } from '@grafana/scenes';

import { getPanelDataForAlert } from './getPanelDataForAlert';
import { VAR_DATASOURCE_EXPR } from '../../../../utils/shared';

jest.mock('@grafana/scenes', () => {
  class MockSceneQueryRunner {
    state: Record<string, unknown>;

    constructor(state: Record<string, unknown>) {
      this.state = state;
    }
  }

  return {
    sceneGraph: {
      getData: jest.fn(),
      findObject: jest.fn(),
      findDescendents: jest.fn(),
      getTimeRange: jest.fn(),
      interpolate: jest.fn(),
    },
    SceneQueryRunner: MockSceneQueryRunner,
    VizPanel: class MockVizPanel {},
  };
});

const mockedSceneGraph = sceneGraph as unknown as {
  getData: jest.Mock;
  findObject: jest.Mock;
  findDescendents: jest.Mock;
  getTimeRange: jest.Mock;
  interpolate: jest.Mock;
};

const createVizPanel = (): VizPanel =>
  ({
    state: {
      pluginId: 'timeseries',
      title: 'Panel ${service}',
      options: {},
      fieldConfig: {},
    },
  }) as unknown as VizPanel;

describe('getPanelDataForAlert', () => {
  beforeEach(() => {
    mockedSceneGraph.getData.mockReturnValue({});
    mockedSceneGraph.findObject.mockReturnValue(undefined);
    mockedSceneGraph.findDescendents.mockReturnValue([]);
    mockedSceneGraph.getTimeRange.mockReturnValue({ state: { value: { from: 'now-1h', to: 'now' } } });
    mockedSceneGraph.interpolate.mockImplementation((_: unknown, value: unknown) => {
      if (typeof value !== 'string') {
        return value;
      }
      if (value === VAR_DATASOURCE_EXPR) {
        return 'tempo-from-variable';
      }
      return value.replace('${service}', 'checkout');
    });
  });

  it('prefers explicit alertTargets over query runner queries', () => {
    mockedSceneGraph.findObject.mockReturnValue(
      new SceneQueryRunner({
        queries: [{ refId: 'A', query: '{runner_query}' }],
        datasource: { uid: 'tempo-runner' },
        maxDataPoints: 64,
      })
    );

    const result = getPanelDataForAlert(createVizPanel(), [{ query: '{${service}=checkout}' }]);

    expect(result).not.toBeNull();
    expect(result?.panel.targets).toEqual([{ query: '{checkout=checkout}' }]);
    expect(result?.panel.targets).not.toEqual([{ query: '{runner_query}' }]);
    expect(result?.panel.maxDataPoints).toBe(64);
  });

  it('interpolates datasource via variable path for explicit alertTargets', () => {
    const result = getPanelDataForAlert(createVizPanel(), [{ query: '{service.name="checkout"}' }]);

    expect(result).not.toBeNull();
    expect(result?.panel.datasource).toEqual({ uid: 'tempo-from-variable' });
  });

  it('returns null when neither explicit targets nor query runner targets exist', () => {
    mockedSceneGraph.findObject.mockReturnValue(
      new SceneQueryRunner({
        queries: [],
        datasource: { uid: 'tempo-runner' },
      })
    );

    const result = getPanelDataForAlert(createVizPanel());

    expect(result).toBeNull();
  });
});
