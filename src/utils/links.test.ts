import { dateTime, PluginExtensionPanelContext } from '@grafana/data';
import { contextToLink, traceqlFiltersToAdHoc, TraceqlFilter } from './links';
import { RESOURCE, SPAN } from './shared';

describe('contextToLink', () => {
  it('should return undefined if context is not provided', () => {
    expect(contextToLink(undefined)).toBeUndefined();
  });

  it('should return undefined if no tempo datasource exists', () => {
    const mockContext = createMockContext([{ datasource: { type: 'other' }, filters: [] }]);
    expect(getLink(mockContext)).toBeUndefined();
  });

  it('should return undefined if tempo datasource has no uid', () => {
    const mockContext = createMockContext([{ datasource: { type: 'tempo' }, filters: [] }]);
    expect(getLink(mockContext)).toBeUndefined();
  });

  it('should return default URL if no valid filters are present', () => {
    const mockContext = createMockContext([{ datasource: { type: 'tempo', uid: 'test-uid' }, filters: [] }]);
    const result = getLink(mockContext);
    expect(result).toBeDefined();
    expect(result?.path).toContain('var-ds=test-uid');
    expect(result?.path).not.toContain('var-filters');
  });

  it('should generate a valid URL with correct params when filters exist', () => {
    const mockContext = createMockContext([
      {
        datasource: { type: 'tempo', uid: 'test-uid' },
        filters: [
          { scope: RESOURCE.toLowerCase(), tag: 'service.name', operator: '=', value: 'grafana' },
          { scope: SPAN.toLowerCase(), tag: 'http.status_code', operator: '=', value: '200' },
        ],
      },
    ]);

    const result = getLink(mockContext);
    expect(result).toBeDefined();
    expect(result?.path).toContain('var-primarySignal=true');
    expect(result?.path).toContain('var-ds=test-uid');
    expect(result?.path).toContain('var-filters=' + encodeURIComponent('resource.service.name|=|grafana'));
    expect(result?.path).toContain('var-filters=' + encodeURIComponent('span.http.status_code|=|200'));
    expect(result?.path).toContain('from=' + encodeURIComponent('30m'));
    expect(result?.path).toContain('to=' + encodeURIComponent('1'));
  });

  it('should set var-metric to errors if status filter has value error', () => {
    const mockContext = createMockContext([
      {
        datasource: { type: 'tempo', uid: 'test-uid' },
        filters: [{ scope: RESOURCE.toLowerCase(), tag: 'status', operator: '=', value: 'error' }],
      },
    ]);

    const result = getLink(mockContext);
    expect(result?.path).toContain('var-metric=errors');
  });

  it('should set var-metric to rate if status filter is not error', () => {
    const mockContext = createMockContext([
      {
        datasource: { type: 'tempo', uid: 'test-uid' },
        filters: [{ scope: RESOURCE.toLowerCase(), tag: 'status', operator: '=', value: 'success' }],
      },
    ]);

    const result = getLink(mockContext);
    expect(result?.path).toContain('var-metric=rate');
  });

  describe('Raw TraceQL Query Parsing', () => {
    it('should parse simple resource filter from raw query', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          query: '{resource.service.name="my-service"}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-ds=test-uid');
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('resource.service.name|=|my-service'));
    });

    it('should parse status filter from raw query and set metric correctly', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          query: '{status=error}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-metric=errors');
    });

    it('should parse multiple filters from raw query', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          query: '{resource.service.name="api" && span.http.status_code=200}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('resource.service.name|=|api'));
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('span.http.status_code|=|200'));
    });

    it('should parse intrinsic fields with colon notation', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          query: '{span:duration>100ms}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('span:duration|>|100ms'));
    });

    it('should prioritize structured filters over raw query', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          filters: [{ scope: RESOURCE.toLowerCase(), tag: 'service.name', operator: '=', value: 'structured' }],
          query: '{resource.service.name="raw"}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('resource.service.name|=|structured'));
      expect(result?.path).not.toContain('raw');
    });

    it('should fallback to raw query when no valid structured filters', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          filters: [], // Empty filters
          query: '{resource.service.name="fallback"}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('resource.service.name|=|fallback'));
    });

    it('should return default URL for invalid raw query', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          query: 'invalid query syntax',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-ds=test-uid');
      expect(result?.path).not.toContain('var-filters');
    });

    it('should return default URL when both filters and query are empty', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          filters: [],
          query: '',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-ds=test-uid');
      expect(result?.path).not.toContain('var-filters');
    });

    it('should handle different operators in raw query', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          query: '{span.http.status_code>=400}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('span.http.status_code|>=|400'));
    });

    it('should handle regex operators in raw query', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          query: '{service.name=~"api.*"}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      // service.name without scope gets parsed as intrinsic scope with service.name tag
      expect(result?.path).toContain('var-filters=intrinsic.service.name%7C%3D%7E%7Capi.*');
    });

    it('should include actionView=traceList when parsing raw query', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          query: '{resource.service.name="my-service"}',
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).toContain('actionView=traceList');
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('resource.service.name|=|my-service'));
    });

    it('should NOT include actionView=traceList when using structured filters', () => {
      const mockContext = createMockContext([
        {
          datasource: { type: 'tempo', uid: 'test-uid' },
          filters: [
            {
              scope: 'resource',
              tag: 'service.name',
              operator: '=',
              value: 'my-service',
            },
          ],
        },
      ]);

      const result = getLink(mockContext);
      expect(result).toBeDefined();
      expect(result?.path).not.toContain('actionView=traceList');
      expect(result?.path).toContain('var-filters=' + encodeURIComponent('resource.service.name|=|my-service'));
    });
  });
});

describe('traceqlFiltersToAdHoc', () => {
  it('should convert resource/span filters with dot separator', () => {
    const filters: TraceqlFilter[] = [
      { scope: 'resource', tag: 'service.name', operator: '=', value: 'api' },
      { scope: 'span', tag: 'http.status_code', operator: '=', value: '200' },
    ];
    const result = traceqlFiltersToAdHoc(filters);
    expect(result).toEqual([
      { key: 'resource.service.name', operator: '=', value: 'api' },
      { key: 'span.http.status_code', operator: '=', value: '200' },
    ]);
  });

  it('should use colon separator for intrinsic fields', () => {
    const filters: TraceqlFilter[] = [
      { scope: 'span', tag: 'status', operator: '=', value: 'error' },
      { scope: 'span', tag: 'duration', operator: '>', value: '100ms' },
    ];
    const result = traceqlFiltersToAdHoc(filters);
    expect(result).toEqual([
      { key: 'span:status', operator: '=', value: 'error' },
      { key: 'span:duration', operator: '>', value: '100ms' },
    ]);
  });

  it('should use tag-only key for intrinsic scope so saved query format is preserved (e.g. kind=server)', () => {
    const filters: TraceqlFilter[] = [
      { scope: 'intrinsic', tag: 'kind', operator: '=', value: 'server' },
    ];
    const result = traceqlFiltersToAdHoc(filters);
    expect(result).toEqual([{ key: 'kind', operator: '=', value: 'server' }]);
  });

  it('should filter out incomplete filters', () => {
    const filters: TraceqlFilter[] = [
      { scope: 'resource', tag: 'service.name', operator: '=', value: 'ok' },
      { scope: 'span', tag: 'status' }, // missing operator and value
      { scope: 'resource', operator: '=', value: 'x' }, // missing tag
      { tag: 'x', operator: '=', value: 'y' }, // missing scope
      { scope: 'span', tag: 'status', operator: '=', value: '' }, // empty value
      { scope: 'span', tag: 'status', operator: '=', value: '   ' }, // whitespace-only value
      { scope: 'span', tag: 'status', operator: '=', value: [] }, // empty array
    ];
    const result = traceqlFiltersToAdHoc(filters);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ key: 'resource.service.name', operator: '=', value: 'ok' });
  });

  it('should join array values with pipe', () => {
    const filters: TraceqlFilter[] = [
      { scope: 'resource', tag: 'service.name', operator: '=~', value: ['api', 'web'] },
    ];
    const result = traceqlFiltersToAdHoc(filters);
    expect(result).toEqual([
      { key: 'resource.service.name', operator: '=~', value: 'api|web' },
    ]);
  });

  it('should return empty array for empty input', () => {
    expect(traceqlFiltersToAdHoc([])).toEqual([]);
  });

  it('should exclude filters missing operator', () => {
    const filters: TraceqlFilter[] = [
      { scope: 'resource', tag: 'service.name', value: 'svc' },
    ];
    const result = traceqlFiltersToAdHoc(filters);
    expect(result).toHaveLength(0);
  });

  it('should handle mixed intrinsic and non-intrinsic filters', () => {
    const filters: TraceqlFilter[] = [
      { scope: 'span', tag: 'status', operator: '=', value: 'error' },
      { scope: 'resource', tag: 'service.name', operator: '=', value: 'frontend' },
    ];
    const result = traceqlFiltersToAdHoc(filters);
    expect(result).toEqual([
      { key: 'span:status', operator: '=', value: 'error' },
      { key: 'resource.service.name', operator: '=', value: 'frontend' },
    ]);
  });
});

const createMockContext = (
  targets: Array<{ datasource: { type: string; uid?: string }; filters?: TraceqlFilter[]; query?: string }> = [{ datasource: { type: 'tempo' }, filters: [] }]
): PluginExtensionPanelContext => {
  return {
    pluginId: 'test-plugin',
    id: 1,
    title: 'Test Title',
    timeRange: { from: '30m', to: dateTime(new Date(1)) },
    targets: targets as any,
  } as PluginExtensionPanelContext;
};

const getLink = (mockContext: PluginExtensionPanelContext) => {
  return contextToLink(mockContext);
};
