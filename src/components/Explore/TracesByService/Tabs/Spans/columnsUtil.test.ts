import { processColumns, DEFAULT_HTTP_SPAN_COLUMNS } from './columnsUtil';

describe('columnsUtil', () => {
  describe('processColumns', () => {
    it('should add all additional columns when no existing columns', () => {
      const result = processColumns('', DEFAULT_HTTP_SPAN_COLUMNS);
      expect(result).toBe(DEFAULT_HTTP_SPAN_COLUMNS.join(', '));
    });

    it('should remove duplicates when existing columns overlap with additional columns', () => {
      const existingColumns = 'span.http.method, span.http.path, custom.column';
      const result = processColumns(existingColumns, DEFAULT_HTTP_SPAN_COLUMNS);
      
      const expectedColumns = [
        'span.http.method',
        'span.http.path', 
        'custom.column',
        'span.http.request.method', 
        'span.http.route', 
        'span.http.status_code', 
        'span.http.response.status_code'
      ];
      
      // Convert both to sets for comparison to ignore order
      const resultSet = new Set(result.split(', '));
      const expectedSet = new Set(expectedColumns);
      
      expect(resultSet.size).toBe(expectedSet.size);
      expectedColumns.forEach(col => {
        expect(resultSet.has(col)).toBe(true);
      });
    });

    it('should handle whitespace in existing columns', () => {
      const existingColumns = ' span.http.method,  custom.column ';
      const result = processColumns(existingColumns, DEFAULT_HTTP_SPAN_COLUMNS);
      
      expect(result.includes(' span.http.method')).toBe(false);
      expect(result.includes('custom.column ')).toBe(false);
      expect(result.includes('span.http.method')).toBe(true);
      expect(result.includes('custom.column')).toBe(true);
    });

    it('should maintain all DEFAULT_HTTP_SPAN_COLUMNS', () => {
      const result = processColumns('custom.column', DEFAULT_HTTP_SPAN_COLUMNS);
      
      DEFAULT_HTTP_SPAN_COLUMNS.forEach(col => {
        expect(result.includes(col)).toBe(true);
      });
    });

    it('should handle empty string for existing columns', () => {
      const result = processColumns('', DEFAULT_HTTP_SPAN_COLUMNS);
      expect(result).toBe(DEFAULT_HTTP_SPAN_COLUMNS.join(', '));
    });

    it('should handle empty additional columns', () => {
      const result = processColumns('column1, column2', []);
      expect(result).toBe('column1, column2');
    });

    it('should handle null or undefined for existing columns', () => {
      // @ts-ignore - intentionally testing with null
      const resultWithNull = processColumns(null, DEFAULT_HTTP_SPAN_COLUMNS);
      // @ts-ignore - intentionally testing with undefined
      const resultWithUndefined = processColumns(undefined, DEFAULT_HTTP_SPAN_COLUMNS);
      
      expect(resultWithNull).toBe(DEFAULT_HTTP_SPAN_COLUMNS.join(', '));
      expect(resultWithUndefined).toBe(DEFAULT_HTTP_SPAN_COLUMNS.join(', '));
    });
  });

  describe('DEFAULT_HTTP_SPAN_COLUMNS', () => {
    it('should contain all required HTTP span columns', () => {
      expect(DEFAULT_HTTP_SPAN_COLUMNS).toContain('span.http.method');
      expect(DEFAULT_HTTP_SPAN_COLUMNS).toContain('span.http.request.method');
      expect(DEFAULT_HTTP_SPAN_COLUMNS).toContain('span.http.route');
      expect(DEFAULT_HTTP_SPAN_COLUMNS).toContain('span.http.path');
      expect(DEFAULT_HTTP_SPAN_COLUMNS).toContain('span.http.status_code');
      expect(DEFAULT_HTTP_SPAN_COLUMNS).toContain('span.http.response.status_code');
    });

    it('should have the correct length', () => {
      expect(DEFAULT_HTTP_SPAN_COLUMNS.length).toBe(6);
    });
  });
}); 
