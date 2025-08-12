import { parseTraceQLQuery } from './limited-traceql-parser';
import { TraceqlFilter } from './links';

describe('Limited TraceQL Parser', () => {
  describe('parseTraceQLQuery', () => {
    it('should return null for empty or invalid queries', () => {
      expect(parseTraceQLQuery('')).toBeNull();
      expect(parseTraceQLQuery(null as any)).toBeNull();
      expect(parseTraceQLQuery(undefined as any)).toBeNull();
      expect(parseTraceQLQuery('invalid query')).toBeNull();
    });

    it('should parse simple resource attribute filters', () => {
      const query = '{resource.service.name="my-service"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        id: 'filter-0',
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'my-service'
      });
    });

    it('should parse intrinsic status filters', () => {
      const query = '{status=error}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        id: 'filter-0',
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'error'
      });
    });

    it('should parse intrinsic fields with colon notation', () => {
      const query = '{span:duration>100ms}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        id: 'filter-0',
        scope: 'span',
        tag: 'duration',
        operator: '>',
        value: '100ms'
      });
    });

    it('should parse multiple filters with logical operators', () => {
      const query = '{resource.service.name="api" && status=error}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({
        id: 'filter-0',
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'api'
      });
      expect(result![1]).toEqual({
        id: 'filter-1',
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'error'
      });
    });

    it('should parse filters with different operators', () => {
      const queries = [
        '{span.http.status_code>=400}',
        '{duration<=100ms}',
        '{name!="healthcheck"}',
        '{service.name=~"api.*"}',
        '{error!~"timeout.*"}'
      ];
      
      const expectedOperators = ['>=', '<=', '!=', '=~', '!~'];
      
      queries.forEach((query, index) => {
        const result = parseTraceQLQuery(query);
        expect(result).toHaveLength(1);
        expect(result![0].operator).toBe(expectedOperators[index]);
      });
    });

    it('should handle quoted values correctly', () => {
      const testCases = [
        { query: '{service.name="my-service"}', expected: 'my-service' },
        { query: "{service.name='my-service'}", expected: 'my-service' },
        { query: '{service.name="value with spaces"}', expected: 'value with spaces' },
        { query: '{service.name="value\\\"with\\\"quotes"}', expected: 'value"with"quotes' },
      ];
      
      testCases.forEach(({ query, expected }) => {
        const result = parseTraceQLQuery(query);
        expect(result).toHaveLength(1);
        expect(result![0].value).toBe(expected);
      });
    });

    it('should parse multiple spansets', () => {
      const query = '{resource.service.name="api"} && {span.http.status_code=200}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({
        id: 'filter-0',
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'api'
      });
      expect(result![1]).toEqual({
        id: 'filter-1',
        scope: 'span',
        tag: 'http.status_code',
        operator: '=',
        value: '200'
      });
    });

    it('should handle complex attribute names', () => {
      const query = '{resource.k8s.pod.name="my-pod" && span.http.target="/api/v1/users"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({
        id: 'filter-0',
        scope: 'resource',
        tag: 'k8s.pod.name',
        operator: '=',
        value: 'my-pod'
      });
      expect(result![1]).toEqual({
        id: 'filter-1',
        scope: 'span',
        tag: 'http.target',
        operator: '=',
        value: '/api/v1/users'
      });
    });

    it('should ignore comments', () => {
      const query = `{
        // This is a comment
        resource.service.name="api" && 
        /* This is a block comment */
        status=error
      }`;
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(2);
      expect(result![0].tag).toBe('service.name');
      expect(result![1].tag).toBe('status');
    });

    it('should handle OR operators', () => {
      const query = '{status=error || status=timeout}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({
        id: 'filter-0',
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'error'
      });
      expect(result![1]).toEqual({
        id: 'filter-1',
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'timeout'
      });
    });

    it('should handle values with pipes for regex operators', () => {
      const query = '{name=~"api|web|service"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        id: 'filter-0',
        scope: 'intrinsic',
        tag: 'name',
        operator: '=~',
        value: 'api|web|service'
      });
    });

    it('should handle different scopes correctly', () => {
      const queries = [
        '{resource.service.name="api"}',
        '{span.http.method="GET"}',
        '{event.name="exception"}',
        '{instrumentation.name="opentelemetry"}',
        '{link.traceID="abc123"}'
      ];
      
      const expectedScopes = ['resource', 'span', 'event', 'instrumentation', 'link'];
      
      queries.forEach((query, index) => {
        const result = parseTraceQLQuery(query);
        expect(result).toHaveLength(1);
        expect(result![0].scope).toBe(expectedScopes[index]);
      });
    });

    it('should handle unscoped intrinsic fields', () => {
      const intrinsicFields = [
        'duration', 'kind', 'name', 'status', 'statusMessage', 'traceDuration',
        'rootName', 'rootServiceName'
      ];
      
      intrinsicFields.forEach(field => {
        const query = `{${field}="test"}`;
        const result = parseTraceQLQuery(query);
        expect(result).toHaveLength(1);
        expect(result![0].scope).toBe('intrinsic');
        expect(result![0].tag).toBe(field);
      });
    });
  });
});
