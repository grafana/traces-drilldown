import { AdHocVariableFilter } from '@grafana/data';
import { renderTraceQLLabelFilters } from './filters-renderer';

describe('filters-renderer', () => {
  describe('renderTraceQLLabelFilters', () => {
    it('should render a single filter correctly', () => {
      const filters: AdHocVariableFilter[] = [
        { key: 'service.name', operator: '=', value: 'test' },
      ];
      expect(renderTraceQLLabelFilters(filters)).toBe('service.name="test"');
    });

    it('should join multiple filters with "&&"', () => {
      const filters: AdHocVariableFilter[] = [
        { key: 'service.name', operator: '=', value: 'test' },
        { key: 'duration', operator: '>', value: '100' },
      ];
      expect(renderTraceQLLabelFilters(filters)).toBe('service.name="test"&&duration>100');
    });

    it('should not add quotes to already quoted values', () => {
      const filters: AdHocVariableFilter[] = [
        { key: 'tag', operator: '=', value: '"already-quoted"' },
      ];
      expect(renderTraceQLLabelFilters(filters)).toBe('tag="already-quoted"');
    });

    it('should not add quotes to status, kind, duration keys', () => {
      const filters: AdHocVariableFilter[] = [
        { key: 'status', operator: '=', value: 'error' },
        { key: 'kind', operator: '=', value: 'client' },
        { key: 'span:status', operator: '=', value: 'ok' },
        { key: 'span:kind', operator: '=', value: 'server' },
      ];
      expect(renderTraceQLLabelFilters(filters)).toBe('status=error&&kind=client&&span:status=ok&&span:kind=server');
    });

    it('should add quotes for partitions and protocol keys', () => {
      const filters: AdHocVariableFilter[] = [
        { key: 'span.messaging.destination.partition.id', operator: '=', value: '1' },
        { key: 'span.network.protocol.version', operator: '=', value: '2' },
      ];
      expect(renderTraceQLLabelFilters(filters)).toBe('span.messaging.destination.partition.id="1"&&span.network.protocol.version="2"');
    });

    it('should handle combined types of filters', () => {
      const filters: AdHocVariableFilter[] = [
        { key: 'service.name', operator: '=', value: 'frontend' },
        { key: 'duration', operator: '>', value: '100' },
        { key: 'status', operator: '=', value: 'error' },
      ];
      expect(renderTraceQLLabelFilters(filters)).toBe('service.name="frontend"&&duration>100&&status=error');
    });

    it('should handle different operators', () => {
      const filters: AdHocVariableFilter[] = [
        { key: 'service.name', operator: '=~', value: 'test' },
        { key: 'duration', operator: '!=', value: '100' },
      ];
      expect(renderTraceQLLabelFilters(filters)).toBe('service.name=~"test"&&duration!=100');
    });

    describe('boolean value handling', () => {
      it('should not add quotes to true/false values', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'span.debug', operator: '=', value: 'true' },
          { key: 'span.error', operator: '=', value: 'false' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('span.debug=true&&span.error=false');
      });

      it('should add quotes to string values that look like booleans', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'service.name', operator: '=', value: '"true"' },
          { key: 'service.type', operator: '=', value: '"false"' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('service.name="true"&&service.type="false"');
      });
    });

    describe('number handling', () => {
      it('should handle integer values without quotes for duration', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'duration', operator: '>', value: '123' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('duration>123');
      });

      it('should handle decimal values without quotes for duration', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'duration', operator: '>', value: '123.45' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('duration>123.45');
      });

      it('should handle negative values without quotes for duration', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'duration', operator: '>', value: '-123' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('duration>-123');
      });

      it('should handle values with whitespace for duration', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'duration', operator: '>', value: ' 123 ' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('duration> 123 ');
      });

      it('should handle numeric strings for non-numeric fields', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'service.id', operator: '=', value: '12345' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('service.id=12345');
      });

      it('should filter out empty string values', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'tag', operator: '=', value: '' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('true');
      });
    });

    describe('string handling', () => {
      it('should escape quotes and backslashes in queries', () => {
        const filters: AdHocVariableFilter[] = [
          { key: 'name', operator: '=', value: 'some "query" \\ ' },
        ];
        expect(renderTraceQLLabelFilters(filters)).toBe('name="some \\"query\\" \\\\ "');
      });
    });
  });
});
