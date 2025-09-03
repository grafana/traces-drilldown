import { parseTraceQLQuery } from './lezer-traceql-parser';

describe('Lezer TraceQL Parser', () => {
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
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'api'
      });
      expect(result![1]).toEqual({
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'error'
      });
    });

    it('should parse filters with different operators (corrected TraceQL syntax)', () => {
      const queries = [
        '{span.http.status_code>=400}',
        '{duration<=100ms}', 
        '{name!="healthcheck"}',
        '{.service.name=~"api.*"}', // Corrected: unscoped attributes should use dot prefix
        '{.error!~"timeout.*"}' // Corrected: unscoped attributes should use dot prefix
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
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'api'
      });
      expect(result![1]).toEqual({
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
        scope: 'resource',
        tag: 'k8s.pod.name',
        operator: '=',
        value: 'my-pod'
      });
      expect(result![1]).toEqual({
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

    // NOTE: OR operators between spansets - parser currently extracts only first spanset
    // This aligns with Tempo Query Builder limitations: the Query Builder cannot create
    // OR relationships between different fields, only within single filters for multiple values
    it('should extract first filter from OR operators (matches Query Builder limitations)', () => {
      const query = '{status=error} || {status=timeout}';
      const result = parseTraceQLQuery(query);
      
      // Parser extracts only the first filter, which aligns with Query Builder design
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'error'
      });
      
      // DESIGN ALIGNMENT: This limitation matches Tempo Query Builder:
      // - Query Builder only creates individual TraceqlFilter objects
      // - OR only exists within single filters: (field=val1 || field=val2)
      // - No UI exists for OR between different spansets
      // - Taking the first condition provides a reasonable drill-down starting point
    });

    it('should handle values with pipes for regex operators', () => {
      const query = '{name=~"api|web|service"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
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

    it('should handle fields without valid scopes as intrinsics', () => {
      const query = '{service.name="my-service"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'intrinsic',
        tag: 'service.name',
        operator: '=',
        value: 'my-service'
      });
    });

    it('should handle regex operators with unscoped fields (corrected syntax)', () => {
      const query = '{.service.name=~"api.*"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'intrinsic', 
        tag: 'service.name',
        operator: '=~',
        value: 'api.*'
      });
    });

    it('should handle complex queries with mixed scopes and operators', () => {
      const query = '{resource.service.name="api" && span:duration>100ms && status=error}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(3);
      expect(result![0]).toEqual({
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'api'
      });
      expect(result![1]).toEqual({
        scope: 'span',
        tag: 'duration',
        operator: '>',
        value: '100ms'
      });
      expect(result![2]).toEqual({
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'error'
      });
    });

    it('should handle numeric values without quotes', () => {
      const query = '{span.http.status_code=200}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'span',
        tag: 'http.status_code',
        operator: '=',
        value: '200'
      });
    });

    it('should handle duration values', () => {
      const query = '{span:duration>=500ms}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'span',
        tag: 'duration',
        operator: '>=',
        value: '500ms'
      });
    });

    it('should handle escaped quotes in values', () => {
      const query = '{resource.service.name="my\\"quoted\\"service"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'my"quoted"service'
      });
    });

    it('should gracefully handle parsing errors', () => {
      const query = '{malformed query with {{{ invalid syntax}';
      const result = parseTraceQLQuery(query);
      
      // Should return null for completely malformed queries
      expect(result).toBeNull();
    });

    it('should handle empty spansets', () => {
      const query = '{}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toBeNull();
    });

    it('should handle whitespace variations', () => {
      const query = '{ resource.service.name = "my-service" }';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'my-service'
      });
    });

    // Tests based on correct TraceQL syntax from documentation
    it('should handle unscoped attributes with dot prefix', () => {
      const query = '{.http.status_code = 200}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'intrinsic',
        tag: 'http.status_code',
        operator: '=',
        value: '200'
      });
    });

    it('should handle numeric comparisons correctly', () => {
      const query = '{.http.status_code >= 400 && .http.status_code < 500}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({
        scope: 'intrinsic',
        tag: 'http.status_code',
        operator: '>=',
        value: '400'
      });
      expect(result![1]).toEqual({
        scope: 'intrinsic',
        tag: 'http.status_code',
        operator: '<',
        value: '500'
      });
    });

    it('should handle regex pattern matching', () => {
      const query = '{.http.url =~ "/api/v2/.*"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'intrinsic',
        tag: 'http.url',
        operator: '=~',
        value: '/api/v2/.*'
      });
    });

    it('should handle duration comparisons', () => {
      const query = '{duration > 10ms}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'intrinsic',
        tag: 'duration',
        operator: '>',
        value: '10ms'
      });
    });

    it('should handle boolean values', () => {
      const query = '{span.flags.sampled=true}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        scope: 'span',
        tag: 'flags.sampled',
        operator: '=',
        value: 'true'
      });
    });

    it('should handle mixed scope and intrinsic filters', () => {
      const query = '{.service.name = "app" && name = "HTTP GET - root"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({
        scope: 'intrinsic',
        tag: 'service.name',
        operator: '=',
        value: 'app'
      });
      expect(result![1]).toEqual({
        scope: 'intrinsic',
        tag: 'name',
        operator: '=',
        value: 'HTTP GET - root'
      });
    });

    // Tests demonstrating how parser handles complex TraceQL features
    // These features are valid TraceQL but not supported by Tempo Query Builder
    describe('Complex TraceQL features - extracts basic filters', () => {
      it('should extract basic filters from structural operators (ignores relationships)', () => {
        // Structural operators are valid TraceQL but Tempo Query Builder has no UI for them
        const query = '{span.name="parent"} > {span.name="child"}';
        const result = parseTraceQLQuery(query);
        
        // Parser extracts both basic filters, ignoring the structural relationship
        expect(result).toHaveLength(2);
        expect(result![0]).toEqual({
          scope: 'span',
          tag: 'name',
          operator: '=',
          value: 'parent'
        });
        expect(result![1]).toEqual({
          scope: 'span', 
          tag: 'name',
          operator: '=',
          value: 'child'
        });
        
        // DESIGN ALIGNMENT: Tempo Query Builder cannot create structural relationships
        // The > (parent-child) relationship is lost, but basic filters are preserved
        // This matches what users can actually create in the Tempo UI
      });

      it('should extract basic filters from pipeline aggregations (ignores pipeline)', () => {
        // Pipeline aggregations - parser extracts the filter part
        const query = '{.db.operation="SELECT"} | count() > 3';
        const result = parseTraceQLQuery(query);
        
        // Parser extracts the basic filter, ignoring the aggregation pipeline
        expect(result).toHaveLength(1);
        expect(result![0]).toEqual({
          scope: 'intrinsic',
          tag: 'db.operation',
          operator: '=',
          value: 'SELECT'
        });
        
        // DESIGN ALIGNMENT: Tempo Query Builder has no UI for pipeline aggregations
        // The | count() > 3 pipeline is ignored, matching Query Builder capabilities
      });

      it('should extract basic filters from descendant operators (ignores relationships)', () => {
        // Descendant operators - parser extracts basic filters from both spansets
        const query = '{.region = "eu-west-0"} >> {.region = "eu-west-1"}';
        const result = parseTraceQLQuery(query);
        
        // Parser extracts both basic filters, ignoring the descendant relationship
        expect(result).toHaveLength(2);
        expect(result![0]).toEqual({
          scope: 'intrinsic',
          tag: 'region',
          operator: '=',
          value: 'eu-west-0'
        });
        expect(result![1]).toEqual({
          scope: 'intrinsic',
          tag: 'region', 
          operator: '=',
          value: 'eu-west-1'
        });
        
        // DESIGN ALIGNMENT: Tempo Query Builder cannot create descendant relationships
        // The >> (descendant) relationship is lost, but filters are preserved
        // This matches the Query Builder's focus on individual field filters
      });
    });

    // Tests for edge cases and parser robustness
    describe('Edge cases and robustness', () => {
      it('should handle queries with only valid spanset filters', () => {
        // This parser is specifically designed for basic spanset filters only
        const query = '{resource.service.name="api" && span.http.status_code=200}';
        const result = parseTraceQLQuery(query);
        
        expect(result).toHaveLength(2);
        expect(result![0].scope).toBe('resource');
        expect(result![1].scope).toBe('span');
      });

      it('should ignore unsupported TraceQL syntax gracefully', () => {
        // Mixed query with both supported filters and unsupported aggregations
        const query = '{resource.service.name="api"} | count() > 5';
        const result = parseTraceQLQuery(query);
        
        // Should extract the basic filter and ignore the aggregation
        expect(result).toHaveLength(1);
        expect(result![0]).toEqual({
          scope: 'resource',
          tag: 'service.name',
          operator: '=',
          value: 'api'
        });
      });
    });
  });
});
