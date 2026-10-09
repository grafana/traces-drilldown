import { setTemplateSrv, TemplateSrv } from '@grafana/runtime';
import {
  AttributeFiltersVariable,
  getTagValuesProvider,
  isNewTagValueResponse,
  mapFromNewTagValue,
  mapFromOldTagValue,
} from './AttributeFiltersVariable';
import { AdHocFiltersVariable } from '@grafana/scenes';
import { DataSourceApi, MetricFindValue } from '@grafana/data';
import { getDataSourceInstance } from '@grafana/plugin-compat/datasources';
import { isUseValueTypeFilteringEnabled } from '../../featureFlags/featureFlags';

jest.mock('../../featureFlags/featureFlags', () => ({
  isUseValueTypeFilteringEnabled: jest.fn(),
}));

jest.mock('@grafana/plugin-compat/datasources', () => ({
  getDataSourceInstance: jest.fn(),
}));

const mockedIsUseValueTypeFilteringEnabled = jest.mocked(isUseValueTypeFilteringEnabled);
const mockedGetDataSourceInstance = jest.mocked(getDataSourceInstance);

describe('AttributeFiltersVariable', () => {
  describe('getTagValuesProvider', () => {
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
      mockedGetDataSourceInstance.mockResolvedValue(mockedDataSourceApi);

      // get rid of annoying 'Failed to patch getAdhocFilters' log in tests
      const templateSrv = { getAdhocFilters: () => {} } as unknown as TemplateSrv;
      setTemplateSrv(templateSrv);

      mockedIsUseValueTypeFilteringEnabled.mockReturnValue(true);
      jest.spyOn(console, 'error').mockRestore();
    });

    it('should get the data source instance with correct arguments', async () => {
      const variable = new AdHocFiltersVariable({ name: 'test-filter' });
      const filter = { key: 'span.name', operator: '=', value: 'internal' };

      await getTagValuesProvider(variable, filter);

      expect(mockedGetDataSourceInstance).toHaveBeenCalledWith('${ds}');
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
          { text: '', value: '""', valueLabels: [''] },
          { text: '', value: '""', valueLabels: [''] },
          { text: 'prod', value: '\"prod\"', valueLabels: ['prod'] },
          { text: '"prod"', value: '\"\\\"prod\\\"\"', valueLabels: ['"prod"'] },
          { text: '', value: '""', valueLabels: [''] },
          { text: '', value: '""', valueLabels: [''] },
          { text: '', value: '""', valueLabels: [''] },
          { text: '', value: '""', valueLabels: [''] },
        ],
      });
    });

    it('should return "replace: false" and skip data source calls when feature flag is turned off', async () => {
      mockedIsUseValueTypeFilteringEnabled.mockReturnValue(false);

      const variable = new AdHocFiltersVariable({ name: 'test-filter' });
      const filter = { key: 'span.name', operator: '=', value: 'internal' };

      const result = await getTagValuesProvider(variable, filter);

      expect(result).toEqual({ replace: false, values: [] });
      expect(mockedGetDataSourceInstance).not.toHaveBeenCalled();
      expect(mockedDataSourceApi.getTagValues).not.toHaveBeenCalled();
    });

    it('should return "replace: false" and no values when an error is thrown', async () => {
      const variable = new AdHocFiltersVariable({ name: 'test-filter' });
      const filter = { key: 'span.name', operator: '=', value: 'internal' };
      (mockedDataSourceApi.getTagValues as jest.Mock).mockRejectedValue(new Error('failed to fetch tag values'));

      const result = await getTagValuesProvider(variable, filter);

      expect(result).toEqual({ replace: false, values: [] });
    });
  });

  describe('isNewTagValueResponse', () => {
    it('should return true if properties.valueType exists in response', () => {
      expect(isNewTagValueResponse({ text: '', properties: { valueType: 'string' } })).toBe(true);
    });

    it('should return false if properties.valueType is missing in response', () => {
      expect(isNewTagValueResponse({ text: '', properties: { valueType: '' } })).toBe(false);
      expect(isNewTagValueResponse({ text: '', properties: {} })).toBe(false);
      expect(isNewTagValueResponse({ text: '' })).toBe(false);
      expect(isNewTagValueResponse({} as MetricFindValue)).toBe(false);
    });
  });

  describe('mapFromOldTagValue', () => {
    it('should map correctly for keys that are always strings no matter what the value is', () => {
      expect(mapFromOldTagValue({ text: '0' }, 'span.messaging.destination.partition.id')).toEqual({
        text: '0',
        value: '"0"',
        valueLabels: ['0'],
      });

      expect(mapFromOldTagValue({ text: '1.0' }, 'span.network.protocol.version')).toEqual({
        text: '1.0',
        value: '"1.0"',
        valueLabels: ['1.0'],
      });
    });

    it('should map correctly for keys that are keywords', () => {
      expect(mapFromOldTagValue({ text: 'ok' }, 'status')).toEqual({ text: 'ok', value: 'ok', valueLabels: ['ok'] });
      expect(mapFromOldTagValue({ text: 'ok' }, 'span:status')).toEqual({
        text: 'ok',
        value: 'ok',
        valueLabels: ['ok'],
      });
      expect(mapFromOldTagValue({ text: 'internal' }, 'kind')).toEqual({
        text: 'internal',
        value: 'internal',
        valueLabels: ['internal'],
      });
      expect(mapFromOldTagValue({ text: 'internal' }, 'span:kind')).toEqual({
        text: 'internal',
        value: 'internal',
        valueLabels: ['internal'],
      });
    });

    it('should map correctly for keys that are durations', () => {
      expect(mapFromOldTagValue({ text: '0s' }, 'duration')).toEqual({ text: '0s', value: '0s', valueLabels: ['0s'] });
      expect(mapFromOldTagValue({ text: '0s' }, 'span:duration')).toEqual({
        text: '0s',
        value: '0s',
        valueLabels: ['0s'],
      });
      expect(mapFromOldTagValue({ text: '0s' }, 'trace:duration')).toEqual({
        text: '0s',
        value: '0s',
        valueLabels: ['0s'],
      });
      expect(mapFromOldTagValue({ text: '0s' }, 'event:timeSinceStart')).toEqual({
        text: '0s',
        value: '0s',
        valueLabels: ['0s'],
      });
    });

    it('should map correctly for values that are numerical', () => {
      expect(mapFromOldTagValue({ text: '0' }, '')).toEqual({ text: '0', value: '0', valueLabels: ['0'] });
      expect(mapFromOldTagValue({ text: '123' }, '')).toEqual({ text: '123', value: '123', valueLabels: ['123'] });
      expect(mapFromOldTagValue({ text: '-123' }, '')).toEqual({ text: '-123', value: '-123', valueLabels: ['-123'] });
      expect(mapFromOldTagValue({ text: '123.45' }, '')).toEqual({
        text: '123.45',
        value: '123.45',
        valueLabels: ['123.45'],
      });
      expect(mapFromOldTagValue({ text: '-123.45' }, '')).toEqual({
        text: '-123.45',
        value: '-123.45',
        valueLabels: ['-123.45'],
      });
    });

    it('should map correctly for values that are bools', () => {
      expect(mapFromOldTagValue({ text: 'true' }, '')).toEqual({
        text: 'true',
        value: 'true',
        valueLabels: ['true'],
      });
      expect(mapFromOldTagValue({ text: 'false' }, '')).toEqual({
        text: 'false',
        value: 'false',
        valueLabels: ['false'],
      });
    });

    it('should map correctly for values that are strings', () => {
      expect(mapFromOldTagValue({ text: 'grafana' }, '')).toEqual({
        text: 'grafana',
        value: '"grafana"',
        valueLabels: ['grafana'],
      });
      expect(mapFromOldTagValue({ text: '13.3.0' }, '')).toEqual({
        text: '13.3.0',
        value: '"13.3.0"',
        valueLabels: ['13.3.0'],
      });
      expect(mapFromOldTagValue({ text: '"true"' }, '')).toEqual({
        text: '"true"',
        value: '\"\\\"true\\\"\"',
        valueLabels: ['"true"'],
      });
    });
  });

  describe('mapFromNewTagValue', () => {
    it('should map correctly for the "int" valueType', () => {
      expect(mapFromNewTagValue({ text: '0', properties: { valueType: 'int' } })).toEqual({
        text: '0',
        value: '0',
        valueLabels: ['0'],
      });
    });

    it('should map correctly for the "float" valueType', () => {
      expect(mapFromNewTagValue({ text: '1.0', properties: { valueType: 'float' } })).toEqual({
        text: '1.0',
        value: '1.0',
        valueLabels: ['1.0'],
      });
    });

    it('should map correctly for the "bool" valueType', () => {
      expect(mapFromNewTagValue({ text: 'true', properties: { valueType: 'bool' } })).toEqual({
        text: 'true',
        value: 'true',
        valueLabels: ['true'],
      });
    });

    it('should map correctly for the "duration" valueType', () => {
      expect(mapFromNewTagValue({ text: '0s', properties: { valueType: 'duration' } })).toEqual({
        text: '0s',
        value: '0s',
        valueLabels: ['0s'],
      });
    });

    it('should map correctly for the "keyword" valueType', () => {
      expect(mapFromNewTagValue({ text: 'unset', properties: { valueType: 'keyword' } })).toEqual({
        text: 'unset',
        value: 'unset',
        valueLabels: ['unset'],
      });
      expect(mapFromNewTagValue({ text: 'client', properties: { valueType: 'keyword' } })).toEqual({
        text: 'client',
        value: 'client',
        valueLabels: ['client'],
      });
    });

    it('should map correctly for the "string" valueType', () => {
      expect(mapFromNewTagValue({ text: 'true', properties: { valueType: 'string' } })).toEqual({
        text: 'true',
        value: '"true"',
        valueLabels: ['true'],
      });
    });
  });

  describe('normalizeFilter', () => {
    beforeEach(() => {
      mockedIsUseValueTypeFilteringEnabled.mockReturnValue(true);
    });

    it('should leave filters unchanged when value type filtering is disabled', () => {
      mockedIsUseValueTypeFilteringEnabled.mockReturnValue(false);

      expect(
        new AttributeFiltersVariable({
          initialFilters: [{ key: 'span.name', operator: '=', value: 'checkout', valueLabels: ['Checkout'] }],
        }).state.filters
      ).toEqual([{ key: 'span.name', operator: '=', value: 'checkout', valueLabels: ['Checkout'] }]);
    });

    it('should leave filters unchanged when the key, operator or value is missing', () => {
      expect(
        new AttributeFiltersVariable({
          initialFilters: [
            { key: '', operator: '=', value: 'checkout' },
            { key: 'span.name', operator: '', value: 'checkout' },
            { key: 'span.name', operator: '=', value: '' },
          ],
        }).state.filters
      ).toEqual([
        { key: '', operator: '=', value: 'checkout' },
        { key: 'span.name', operator: '', value: 'checkout' },
        { key: 'span.name', operator: '=', value: '' },
      ]);
    });

    it('should quote string values and preserve the operator and key label', () => {
      expect(
        new AttributeFiltersVariable({
          initialFilters: [{ key: 'span.name', keyLabel: 'Span name', operator: '!=', value: 'checkout' }],
        }).state.filters
      ).toEqual([
        { key: 'span.name', keyLabel: 'Span name', operator: '!=', value: '"checkout"', valueLabels: ['checkout'] },
      ]);
    });

    it('should normalize already quoted strings and replace stale value labels', () => {
      expect(
        new AttributeFiltersVariable({
          initialFilters: [
            { key: 'span.name', operator: '=', value: '"checkout"', valueLabels: ['stale'] },
            { key: 'span.name', operator: '=', value: '""' },
          ],
        }).state.filters
      ).toEqual([
        { key: 'span.name', operator: '=', value: '"checkout"', valueLabels: ['checkout'] },
        { key: 'span.name', operator: '=', value: '""', valueLabels: [''] },
      ]);
    });

    it('should keep numeric, boolean, keyword and duration values unquoted', () => {
      expect(
        new AttributeFiltersVariable({
          initialFilters: [
            { key: 'span.http.status_code', operator: '=', value: '200' },
            { key: 'span.error', operator: '=', value: 'false' },
            { key: 'status', operator: '=', value: '"error"' },
            { key: 'duration', operator: '>', value: '100ms' },
          ],
        }).state.filters
      ).toEqual([
        { key: 'span.http.status_code', operator: '=', value: '200', valueLabels: ['200'] },
        { key: 'span.error', operator: '=', value: 'false', valueLabels: ['false'] },
        { key: 'status', operator: '=', value: 'error', valueLabels: ['error'] },
        { key: 'duration', operator: '>', value: '100ms', valueLabels: ['100ms'] },
      ]);
    });

    it('should escape quotes, backslashes and newlines when value labels are missing', () => {
      expect(
        new AttributeFiltersVariable({
          initialFilters: [
            { key: 'span.name', operator: '=', value: 'say "hi" now' },
            { key: 'span.name', operator: '=', value: 'C:\\temp' },
            { key: 'span.name', operator: '=', value: 'line1\nline2' },
          ],
        }).state.filters
      ).toEqual([
        { key: 'span.name', operator: '=', value: '"say \\"hi\\" now"', valueLabels: ['say "hi" now'] },
        { key: 'span.name', operator: '=', value: '"C:\\\\temp"', valueLabels: ['C:\\temp'] },
        { key: 'span.name', operator: '=', value: '"line1\\nline2"', valueLabels: ['line1\nline2'] },
      ]);
    });

    it('should escape values restored from urls where the value label equals the value', () => {
      expect(
        new AttributeFiltersVariable({
          initialFilters: [{ key: 'span.name', operator: '=', value: 'say "hi" now', valueLabels: ['say "hi" now'] }],
        }).state.filters
      ).toEqual([{ key: 'span.name', operator: '=', value: '"say \\"hi\\" now"', valueLabels: ['say "hi" now'] }]);
    });

    it('should not escape already normalized values again', () => {
      expect(
        new AttributeFiltersVariable({
          initialFilters: [
            { key: 'span.name', operator: '=', value: '"say \\"hi\\" now"', valueLabels: ['say "hi" now'] },
            { key: 'span.name', operator: '=', value: '"C:\\\\temp"', valueLabels: ['C:\\temp'] },
            { key: 'span.name', operator: '=', value: '"line1\\nline2"', valueLabels: ['line1\nline2'] },
          ],
        }).state.filters
      ).toEqual([
        { key: 'span.name', operator: '=', value: '"say \\"hi\\" now"', valueLabels: ['say "hi" now'] },
        { key: 'span.name', operator: '=', value: '"C:\\\\temp"', valueLabels: ['C:\\temp'] },
        { key: 'span.name', operator: '=', value: '"line1\\nline2"', valueLabels: ['line1\nline2'] },
      ]);
    });
  });
});
