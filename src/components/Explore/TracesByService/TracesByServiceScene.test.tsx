import { buildQuery } from './TracesByServiceScene';
import { ComparisonSelection, VAR_FILTERS, VAR_LATENCY_THRESHOLD, VAR_PRIMARY_SIGNAL } from '../../../utils/shared';

describe('TracesByServiceScene', () => {
  describe('buildQuery', () => {
    it('should build basic query with no selection', () => {
      const query = buildQuery('rate', '');
      expect(query).toEqual({
        refId: 'A',
        query: `{\${${VAR_PRIMARY_SIGNAL}\} && $\{${VAR_FILTERS}\}}`,
        queryType: 'traceql',
        tableType: 'spans',
        limit: 200,
        spss: 10,
        filters: [],
      });
    });

    it('should add error status for error type', () => {
      const query = buildQuery('errors', '');
      expect(query.query).toBe(`{\${${VAR_PRIMARY_SIGNAL}\} && $\{${VAR_FILTERS}\} && status = error}`);
    });

    it('should add latency threshold for duration type with no selection', () => {
      const query = buildQuery('duration', '');
      expect(query.query).toBe(`{\${${VAR_PRIMARY_SIGNAL}\} && $\{${VAR_FILTERS}\}&& duration > \${${VAR_LATENCY_THRESHOLD}\}}`);
    });

    it('should handle duration selection range', () => {
      const selection: ComparisonSelection = {
        type: 'manual',
        duration: {
          from: '100ms',
          to: '500ms',
        },
      };
      const query = buildQuery('duration', '', selection);
      expect(query.query).toBe(`{\${${VAR_PRIMARY_SIGNAL}\} && $\{${VAR_FILTERS}\}&& duration >= 100ms && duration <= 500ms}`);
    });

    it('should handle duration selection with only from', () => {
      const selection: ComparisonSelection = {
        type: 'manual',
        duration: {
          from: '100ms',
          to: '',
        },
      };
      const query = buildQuery('duration', '', selection);
      expect(query.query).toBe(`{\${${VAR_PRIMARY_SIGNAL}\} && $\{${VAR_FILTERS}\}&& duration >= 100ms}`);
    });

    it('should handle duration selection with only to', () => {
      const selection: ComparisonSelection = {
        type: 'manual',
        duration: {
          from: '',
          to: '500ms',
        },
      };
      const query = buildQuery('duration', '', selection);
      expect(query.query).toBe(`{\${${VAR_PRIMARY_SIGNAL}\} && $\{${VAR_FILTERS}\}&& duration <= 500ms}`);
    });

    it('should add select columns when provided', () => {
      const query = buildQuery('rate', 'duration,service.name');
      expect(query.query).toBe(`{\${${VAR_PRIMARY_SIGNAL}\} && $\{${VAR_FILTERS}\}} | select(duration,service.name)`);
    });
  });
});
