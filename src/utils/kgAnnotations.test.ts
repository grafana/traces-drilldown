import { config } from '@grafana/runtime';
import { getKgSceneProps } from './kgAnnotations';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  config: {
    datasources: {},
  },
}));

jest.mock('@grafana/scenes', () => {
  const actual = jest.requireActual('@grafana/scenes');
  return {
    ...actual,
    dataLayers: {
      AnnotationsDataLayer: class MockAnnotationsDataLayer {
        constructor(public state: unknown) {}
        setState = jest.fn();
      },
    },
  };
});

const mockConfig = config as { datasources: Record<string, { uid: string; type: string }> };

describe('getKgSceneProps', () => {
  beforeEach(() => {
    mockConfig.datasources = {};
  });

  it('returns undefined when KG datasource is not available', () => {
    mockConfig.datasources = {
      tempo: { uid: 'some-tempo-ds', type: 'tempo' },
    };

    expect(getKgSceneProps()).toBeUndefined();
  });

  it('returns scene props when KG datasource is available', () => {
    mockConfig.datasources = {
      kg: { uid: 'grafanacloud-knowledgegraph', type: 'grafana-knowledgegraph-datasource' },
    };

    const result = getKgSceneProps();
    expect(result).toBeDefined();
    expect(result!.$data).toBeDefined();
    expect(result!.behaviors).toHaveLength(1);
    expect(result!.controls).toBeDefined();
  });

  it('returns props with an empty layer set initially', () => {
    mockConfig.datasources = {
      kg: { uid: 'grafanacloud-knowledgegraph', type: 'grafana-knowledgegraph-datasource' },
    };

    const result = getKgSceneProps();
    expect(result!.$data.state.layers).toHaveLength(0);
  });
});
