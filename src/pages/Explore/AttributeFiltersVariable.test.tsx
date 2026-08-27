import { DataSourceSrv, setDataSourceSrv, setTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { getTagValuesProvider } from './AttributeFiltersVariable';
import { AdHocFiltersVariable } from '@grafana/scenes';
import { DataSourceApi } from '@grafana/data';
import { isUseValueTypeFilteringEnabled } from '../../featureFlags/featureFlags';
import { explorationDS } from 'utils/shared';

jest.mock('../../featureFlags/featureFlags', () => ({
  isUseValueTypeFilteringEnabled: jest.fn(),
}));

const mockIsUseValueTypeFilteringEnabled = jest.mocked(isUseValueTypeFilteringEnabled);

describe('AttributeFiltersVariable', () => {
  describe('getTagValuesProvider', () => {
    let mockedDataSourceSrv: DataSourceSrv;
    let mockedDataSourceApi: DataSourceApi;

    beforeEach(() => {
      jest.resetAllMocks();
      mockedDataSourceApi = {
        getRef: jest.fn(),
        meta: {} as DataSourceApi['meta'],
        name: 'test',
        query: jest.fn(),
        testDatasource: jest.fn(),
        type: '',
        uid: '',
        getTagValues: jest.fn().mockResolvedValue([]),
      };
      mockedDataSourceSrv = {
        get: jest.fn().mockResolvedValue(mockedDataSourceApi),
        getInstanceSettings: jest.fn(),
        getList: jest.fn(),
        registerRuntimeDataSource: jest.fn(),
        reload: jest.fn(),
      };
      setDataSourceSrv(mockedDataSourceSrv);

      // get rid of annoying 'Failed to patch getAdhocFilters' log in tests
      const templateSrv = { getAdhocFilters: () => {} } as unknown as TemplateSrv;
      setTemplateSrv(templateSrv);

      mockIsUseValueTypeFilteringEnabled.mockReturnValue(true);
      jest.spyOn(console, 'error').mockRestore();
    });

    it('should get the data source instance with correct arguments', async () => {
      const variable = new AdHocFiltersVariable({ name: 'test-filter' });
      const filter = { key: 'span.name', operator: '=', value: 'internal' };

      await getTagValuesProvider(variable, filter);

      expect(mockedDataSourceSrv.get).toHaveBeenCalledWith(explorationDS, { __sceneObject: { value: variable } });
    });

    it('should call getTagValues with correct arguments', async () => {
      const variable = new AdHocFiltersVariable({ name: 'test-filter' });
      const filter = { key: 'span.name', operator: '=', value: 'internal' };

      await getTagValuesProvider(variable, filter);

      expect(mockedDataSourceApi.getTagValues).toHaveBeenCalledWith({ filters: [filter], key: filter.key });
    });

    it('should append value and valueLabels on all values that include valueType in properties', async () => {
      const variable = new AdHocFiltersVariable({ name: 'test-filter' });
      const filter = { key: 'span.name', operator: '=', value: 'internal' };
      (mockedDataSourceApi.getTagValues as jest.Mock).mockResolvedValue([
        { text: '123', properties: { valueType: 'int' } },
        { text: '123.45', properties: { valueType: 'float' } },
        { text: 'false', properties: { valueType: 'bool' } },
        { text: '10ms', properties: { valueType: 'duration' } },
        { text: 'unset', properties: { valueType: 'keyword' } },
        { text: '1.1', properties: { valueType: 'string' } },
        { text: '"foo"', properties: { valueType: 'string' } },
        { text: '""', properties: { valueType: 'string' } },
        {},
        { text: '' },
        { text: 'prod' },
        { text: '"prod"' },
        { text: '', properties: {} },
        { text: '', properties: { valueType: '' } },
        { text: '', properties: { valueType: null } },
        { text: '', properties: { valueType: undefined } },
      ]);

      const result = await getTagValuesProvider(variable, filter);

      expect(result).toEqual({
        replace: true,
        values: [
          { text: '123', value: '123', valueLabels: ['123'] },
          { text: '123.45', value: '123.45', valueLabels: ['123.45'] },
          { text: 'false', value: 'false', valueLabels: ['false'] },
          { text: '10ms', value: '10ms', valueLabels: ['10ms'] },
          { text: 'unset', value: 'unset', valueLabels: ['unset'] },
          { text: '1.1', value: '"1.1"', valueLabels: ['1.1'] },
          { text: '"foo"', value: '"foo"', valueLabels: ['foo'] },
          { text: '""', value: '""', valueLabels: [''] },
          { text: '' },
          { text: '' },
          { text: 'prod' },
          { text: '"prod"' },
          { text: '' },
          { text: '' },
          { text: '' },
          { text: '' },
        ],
      });
    });

    it('should return "replace: false" and skip data source calls when feature flag is turned off', async () => {
      mockIsUseValueTypeFilteringEnabled.mockReturnValue(false);

      const variable = new AdHocFiltersVariable({ name: 'test-filter' });
      const filter = { key: 'span.name', operator: '=', value: 'internal' };

      const result = await getTagValuesProvider(variable, filter);

      expect(result).toEqual({ replace: false, values: [] });
      expect(mockedDataSourceSrv.get).not.toHaveBeenCalled();
      expect(mockedDataSourceApi.getTagValues).not.toHaveBeenCalled();
    });

    it('should return "replace: false" and no values when an error is thrown', async () => {
      const consoleErrorMock = jest.fn();
      jest.spyOn(console, 'error').mockImplementation(consoleErrorMock);
      const variable = new AdHocFiltersVariable({ name: 'test-filter' });
      const filter = { key: 'span.name', operator: '=', value: 'internal' };
      (mockedDataSourceApi.getTagValues as jest.Mock).mockRejectedValue(new Error('failed to fetch tag values'));

      const result = await getTagValuesProvider(variable, filter);

      expect(result).toEqual({ replace: false, values: [] });
      expect(consoleErrorMock).toHaveBeenCalledWith(
        'TracesDrilldown: failed to retrieve tag values for filter with key:"span.name", operator:"=" and value:"internal"',
        new Error('failed to fetch tag values')
      );
    });
  });
});
