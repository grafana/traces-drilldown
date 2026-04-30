import { buildExceptionFilterExpr, getMessageHighlight } from './ExceptionAccordion';

const mockGetTraceExplorationScene = jest.fn().mockReturnValue({ state: {} });

jest.mock('utils/utils', () => ({
  getPrimarySignalVariable: () => ({ state: { value: 'resource.service.name="api"' } }),
  getFiltersVariable: () => ({ state: { filters: [{ key: 'foo', operator: '=', value: 'bar' }] } }),
  getTraceExplorationScene: (scene: unknown) => mockGetTraceExplorationScene(scene),
}));

jest.mock('utils/filters-renderer', () => {
  const actual = jest.requireActual<typeof import('utils/filters-renderer')>('utils/filters-renderer');
  return {
    ...actual,
    renderTraceQLLabelFilters: () => 'foo="bar"',
  };
});

describe('ExceptionAccordion helpers', () => {
  describe('getMessageHighlight', () => {
    it('returns highlight parts for error token', () => {
      const result = getMessageHighlight('Something Error: Foo: bar');
      expect(result).toEqual({
        prefix: 'Something ',
        afterErrorSeparator: ' ',
        highlightText: 'Foo:',
        suffix: ' bar',
      });
    });

    it('highlights message without the error token', () => {
      const result = getMessageHighlight('Failure: nope');
      expect(result).toEqual({
        prefix: '',
        afterErrorSeparator: '',
        highlightText: 'Failure:',
        suffix: ' nope',
      });
    });
  });

  describe('buildExceptionFilterExpr', () => {
    const scene = {} as any;

    it('builds a filter with escaped values', () => {
      const expr = buildExceptionFilterExpr({
        exceptionMessage: 'bad "value" \\ here',
        exceptionType: 'TypeError',
        scene,
      });

      expect(expr).toContain('resource.service.name="api"');
      expect(expr).toContain('foo="bar"');
      expect(expr).toContain('status = error');
      expect(expr).toContain('event.exception.message = "bad \\"value\\" \\\\ here"');
      expect(expr).toContain('event.exception.type = "TypeError"');
    });

    it('omits type filter when type is Unknown', () => {
      const expr = buildExceptionFilterExpr({
        exceptionMessage: 'bad',
        exceptionType: 'Unknown',
        scene,
      });

      expect(expr).not.toContain('event.exception.type');
    });

    it('prepends initialOrFilters as a parenthesized OR group', () => {
      mockGetTraceExplorationScene.mockReturnValueOnce({
        state: {
          initialOrFilters: [
            { key: 'resource.service.name', operator: '=', value: 'svc-a' },
            { key: 'resource.service.name', operator: '=', value: 'svc-b' },
          ],
        },
      });

      const expr = buildExceptionFilterExpr({
        exceptionMessage: 'bad',
        scene,
      });

      expect(expr).toContain('(resource.service.name="svc-a"||resource.service.name="svc-b") && ');
    });
  });
});

