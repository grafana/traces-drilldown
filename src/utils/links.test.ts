import { PluginExtensionPanelContext } from '@grafana/data';
import { contextToLink, TraceqlFilter } from './links';
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

  it('should return undefined if no valid filters are present', () => {
    const mockContext = createMockContext([{ datasource: { type: 'tempo', uid: 'test-uid' }, filters: [] }]);
    expect(getLink(mockContext)).toBeUndefined();
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
    expect(result?.path).toContain('var-ds=test-uid');
    expect(result?.path).toContain('var-filters=' + encodeURIComponent('resource.service.name|=|grafana'));
    expect(result?.path).toContain('var-filters=' + encodeURIComponent('span.http.status_code|=|200'));
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
});

const createMockContext = (
  targets: Array<{ datasource: { type: string; uid?: string }; filters: TraceqlFilter[] }> = [{ datasource: { type: 'tempo' }, filters: [] }]
): PluginExtensionPanelContext => {
  return {
    pluginId: 'test-plugin',
    id: 1,
    title: 'Test Title',
    timeRange: { from: '30m', to: 'now-30m' },
    targets: targets as any,
  } as PluginExtensionPanelContext;
};

const getLink = (mockContext: PluginExtensionPanelContext) => {
  return contextToLink(mockContext);
};
