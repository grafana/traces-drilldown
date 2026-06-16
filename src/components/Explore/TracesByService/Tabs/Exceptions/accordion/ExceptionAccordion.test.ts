import { buildExceptionFilterExpr, getMessageHighlight } from './ExceptionAccordion';

jest.mock('utils/utils', () => ({
  getPrimarySignalVariable: () => ({ state: { value: 'resource.service.name="api"' } }),
  getFiltersVariable: () => ({ state: { filters: [{ key: 'foo', operator: '=', value: 'bar' }] } }),
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

    it('uses regex match when normalized message contains placeholders', () => {
      const expr = buildExceptionFilterExpr({
        exceptionMessage: 'Error: HttpException: Connection closed before full header was received, uri = <url>',
        exceptionType: 'HttpException',
        scene,
      });

      expect(expr).toContain('event.exception.message =~ "');
      expect(expr).not.toContain('event.exception.message = "Error: HttpException');
      expect(expr).toContain('https?://\\\\S+');
      expect(expr).toContain('event.exception.type = "HttpException"');
    });

    it('uses numeric character classes for <num> placeholder regex', () => {
      const expr = buildExceptionFilterExpr({
        exceptionMessage:
          'Error: HttpException: Content size below specified contentLength. <num> bytes written but expected <num>., uri = <url>',
        exceptionType: 'HttpException',
        scene,
      });

      expect(expr).toContain('[0-9]+');
      expect(expr).not.toContain('\\\\d+');
    });
  });
});

