import { getKgSceneProps } from './kgAnnotations';
import { getDataSourceInstanceList } from '@grafana/plugin-compat/datasources';

jest.mock('@grafana/plugin-compat/datasources', () => ({
  getDataSourceInstanceList: jest.fn(),
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

const getDataSourceInstanceListMock = jest.mocked(getDataSourceInstanceList);

describe('getKgSceneProps', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getDataSourceInstanceListMock.mockResolvedValue([]);
  });

  it('returns undefined when KG datasource is not available', async () => {
    expect(await getKgSceneProps()).toBeUndefined();
  });

  it('returns scene props when KG datasource is available', async () => {
    getDataSourceInstanceListMock.mockResolvedValue([
      { uid: 'grafanacloud-knowledgegraph', type: 'grafana-knowledgegraph-datasource' },
    ]);

    const result = await getKgSceneProps();
    expect(result).toBeDefined();
    expect(result!.$data).toBeDefined();
    expect(result!.behaviors).toHaveLength(1);
    expect(result!.controls).toBeDefined();
  });

  it('returns props with an empty layer set initially', async () => {
    getDataSourceInstanceListMock.mockResolvedValue([
      { uid: 'grafanacloud-knowledgegraph', type: 'grafana-knowledgegraph-datasource' },
    ]);

    const result = await getKgSceneProps();
    expect(result!.$data.state.layers).toHaveLength(0);
  });
});
