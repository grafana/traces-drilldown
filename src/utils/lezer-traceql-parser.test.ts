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
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'my-service'
      });
    });

    it('should parse intrinsic status filters', () => {
      const query = '{status=error}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'error'
      });
    });

    it('should parse intrinsic fields with colon notation', () => {
      const query = '{span:duration>100ms}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'span',
        tag: 'duration',
        operator: '>',
        value: '100ms'
      });
    });

    it('should parse multiple filters with logical operators', () => {
      const query = '{resource.service.name="api" && status=error}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(2);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'api'
      });
      expect(result!.filters[1]).toEqual({
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
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.filters[0].operator).toBe(expectedOperators[index]);
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
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.filters[0].value).toBe(expected);
      });
    });

    it('should parse multiple spansets', () => {
      const query = '{resource.service.name="api"} && {span.http.status_code=200}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(2);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'api'
      });
      expect(result!.filters[1]).toEqual({
        scope: 'span',
        tag: 'http.status_code',
        operator: '=',
        value: '200'
      });
    });

    it('should handle complex attribute names', () => {
      const query = '{resource.k8s.pod.name="my-pod" && span.http.target="/api/v1/users"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(2);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'resource',
        tag: 'k8s.pod.name',
        operator: '=',
        value: 'my-pod'
      });
      expect(result!.filters[1]).toEqual({
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
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(2);
      expect(result!.filters[0].tag).toBe('service.name');
      expect(result!.filters[1].tag).toBe('status');
    });

    // Tests for features that Query Builder CANNOT generate
    describe('TraceQL features beyond Query Builder scope', () => {
      it('should extract first spanset from OR between different fields and report error', () => {
        // This pattern cannot be generated by Query Builder - it only supports AND between filters
        const query = '{service.name="frontend"} || {status=error}';
        const result = parseTraceQLQuery(query);
        
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.errors).toHaveLength(1);
        
        // Parser extracts only the first spanset to avoid changing OR to AND
        expect(result!.filters[0]).toEqual({
          scope: 'intrinsic',
          tag: 'service.name',
          operator: '=',
          value: 'frontend'
        });
        
        // Parser reports the limitation as an error
        expect(result!.errors[0]).toEqual({
          type: 'unsupported_or_between_fields',
          message: 'OR operators are not supported in traces-drilldown. Using first filter only. Subsequent filters after || could not be applied because traces-drilldown does not support || operators.',
          query
        });
      });

      it('should handle complex OR query with parentheses and report error', () => {
        // Test the specific query from the user
        const query = '{resource.service.name="quoteservice"} || {span.app.ads.ad_request_type="TARGETED"}';
        const result = parseTraceQLQuery(query);
        
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.errors).toHaveLength(1);
        
        // Parser extracts only the first filter to preserve query semantics
        expect(result!.filters[0]).toEqual({
          scope: 'resource',
          tag: 'service.name',
          operator: '=',
          value: 'quoteservice'
        });
        
        // Parser reports the OR limitation as an error
        expect(result!.errors[0]).toEqual({
          type: 'unsupported_or_between_fields',
          message: 'OR operators are not supported in traces-drilldown. Using first filter only. Subsequent filters after || could not be applied because traces-drilldown does not support || operators.',
          query
        });
      });

      it('should handle OR within single spanset and report error', () => {
        // Test OR within a single spanset (your exact local query format)
        const query = '{resource.service.name="quoteservice" || span.app.ads.ad_request_type="TARGETED"}';
        const result = parseTraceQLQuery(query);
        
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.errors).toHaveLength(1);
        
        // Parser extracts only the first filter
        expect(result!.filters[0]).toEqual({
          scope: 'resource',
          tag: 'service.name',
          operator: '=',
          value: 'quoteservice'
        });
        
        // Parser reports the OR limitation
        expect(result!.errors[0].type).toBe('unsupported_or_between_fields');
        expect(result!.errors[0].message).toContain('OR operators are not supported in traces-drilldown');
      });

      it('should extract first spanset from OR between same fields in different spansets', () => {
        // This is different from Query Builder's (field=val1 || field=val2) pattern
        const query = '{status=error} || {status=timeout}';
        const result = parseTraceQLQuery(query);
        
        // Parser extracts only the first spanset
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.errors).toHaveLength(1);
        expect(result!.filters[0]).toEqual({
          scope: 'intrinsic',
          tag: 'status',
          operator: '=',
          value: 'error'
        });
        
        // NOTE: Query Builder would generate this as: {(status=error || status=timeout)}
        // The above pattern with separate spansets cannot be created by Query Builder UI
      });
    });

    it('should handle values with pipes for regex operators', () => {
      const query = '{name=~"api|web|service"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
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
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.filters[0].scope).toBe(expectedScopes[index]);
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
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.filters[0].scope).toBe('intrinsic');
        expect(result!.filters[0].tag).toBe(field);
      });
    });

    it('should handle fields without valid scopes as intrinsics', () => {
      const query = '{service.name="my-service"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic',
        tag: 'service.name',
        operator: '=',
        value: 'my-service'
      });
    });

    it('should handle regex operators with unscoped fields (corrected syntax)', () => {
      const query = '{.service.name=~"api.*"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic', 
        tag: 'service.name',
        operator: '=~',
        value: 'api.*'
      });
    });

    it('should handle complex queries with mixed scopes and operators', () => {
      const query = '{resource.service.name="api" && span:duration>100ms && status=error}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(3);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'api'
      });
      expect(result!.filters[1]).toEqual({
        scope: 'span',
        tag: 'duration',
        operator: '>',
        value: '100ms'
      });
      expect(result!.filters[2]).toEqual({
        scope: 'intrinsic',
        tag: 'status',
        operator: '=',
        value: 'error'
      });
    });

    it('should handle numeric values without quotes', () => {
      const query = '{span.http.status_code=200}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'span',
        tag: 'http.status_code',
        operator: '=',
        value: '200'
      });
    });

    it('should handle duration values', () => {
      const query = '{span:duration>=500ms}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'span',
        tag: 'duration',
        operator: '>=',
        value: '500ms'
      });
    });

    it('should handle escaped quotes in values', () => {
      const query = '{resource.service.name="my\\"quoted\\"service"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
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
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
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
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic',
        tag: 'http.status_code',
        operator: '=',
        value: '200'
      });
    });

    it('should handle numeric comparisons correctly', () => {
      const query = '{.http.status_code >= 400 && .http.status_code < 500}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(2);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic',
        tag: 'http.status_code',
        operator: '>=',
        value: '400'
      });
      expect(result!.filters[1]).toEqual({
        scope: 'intrinsic',
        tag: 'http.status_code',
        operator: '<',
        value: '500'
      });
    });

    it('should handle regex pattern matching', () => {
      const query = '{.http.url =~ "/api/v2/.*"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic',
        tag: 'http.url',
        operator: '=~',
        value: '/api/v2/.*'
      });
    });

    it('should handle duration comparisons', () => {
      const query = '{duration > 10ms}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic',
        tag: 'duration',
        operator: '>',
        value: '10ms'
      });
    });

    it('should handle boolean values', () => {
      const query = '{span.flags.sampled=true}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'span',
        tag: 'flags.sampled',
        operator: '=',
        value: 'true'
      });
    });

    it('should handle mixed scope and intrinsic filters', () => {
      const query = '{.service.name = "app" && name = "HTTP GET - root"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(2);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic',
        tag: 'service.name',
        operator: '=',
        value: 'app'
      });
      expect(result!.filters[1]).toEqual({
        scope: 'intrinsic',
        tag: 'name',
        operator: '=',
        value: 'HTTP GET - root'
      });
    });

    it('should reject Query Builder OR pattern and report error', () => {
      // Even Query Builder's multiple value OR pattern cannot be supported by links.ts
      const query = '{(resource.service.name="quoteservice" || resource.service.name="cartservice")}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(1);
      
      // Parser extracts only the first filter
      expect(result!.filters[0]).toEqual({
        scope: 'resource',
        tag: 'service.name',
        operator: '=',
        value: 'quoteservice'
      });
      
      // Parser reports that OR is not supported
      expect(result!.errors[0].type).toBe('unsupported_or_between_fields');
      expect(result!.errors[0].message).toContain('OR operators are not supported in traces-drilldown');
    });

    it('should reject multiple string values OR pattern and report error', () => {
      // Query Builder generates this but links.ts cannot support it
      const query = '{(span.http.method="GET" || span.http.method="POST")}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(1);
      expect(result!.filters[0]).toEqual({
        scope: 'span',
        tag: 'http.method',
        operator: '=',
        value: 'GET'
      });
      expect(result!.errors[0].message).toContain('OR operators are not supported in traces-drilldown');
    });

    it('should reject multiple numeric values OR pattern and report error', () => {
      // Query Builder generates this but links.ts cannot support it
      const query = '{(span.http.status_code=200 || span.http.status_code=404)}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(1);
      expect(result!.filters[0]).toEqual({
        scope: 'span',
        tag: 'http.status_code',
        operator: '=',
        value: '200'
      });
      expect(result!.errors[0].message).toContain('OR operators are not supported in traces-drilldown');
    });

    it('should handle regex with multiple values (Query Builder pattern)', () => {
      // Query Builder generates this for regex operators with multiple values
      const query = '{service.name=~"frontend|backend"}';
      const result = parseTraceQLQuery(query);
      
      expect(result).not.toBeNull();
      expect(result!.filters).toHaveLength(1);
      expect(result!.errors).toHaveLength(0);
      expect(result!.filters[0]).toEqual({
        scope: 'intrinsic',
        tag: 'service.name',
        operator: '=~',
        value: 'frontend|backend'
      });
    });

    // Tests for all scopes that Query Builder supports
    describe('All supported scopes (Query Builder generates these)', () => {
      it('should handle all TraceqlSearchScope enum values', () => {
        const testCases = [
          { query: '{resource.cluster="prod"}', expectedScope: 'resource' },
          { query: '{span.http.method="GET"}', expectedScope: 'span' },
          { query: '{event.name="exception"}', expectedScope: 'event' },
          { query: '{instrumentation.name="jaeger"}', expectedScope: 'instrumentation' },
          { query: '{link.traceID="abc123"}', expectedScope: 'link' },
          { query: '{duration>100ms}', expectedScope: 'intrinsic' }, // intrinsic without prefix
          { query: '{.custom.field="value"}', expectedScope: 'intrinsic' }, // unscoped treated as intrinsic
        ];
        
        testCases.forEach(({ query, expectedScope }) => {
          const result = parseTraceQLQuery(query);
                  expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.filters[0].scope).toBe(expectedScope);
        });
      });
    });

    // Tests demonstrating parser behavior with TraceQL features that Query Builder cannot generate
    describe('TraceQL features beyond Query Builder scope', () => {
      it('should extract basic filters from structural operators and report error', () => {
        // Structural operators are valid TraceQL but Query Builder has no UI for them
        const query = '{span.name="parent"} > {span.name="child"}';
        const result = parseTraceQLQuery(query);
        
        expect(result).not.toBeNull();
        expect(result!.errors).toHaveLength(1);
        
        // Parser combines filters with same field into array values
        expect(result!.filters).toHaveLength(1);
        expect(result!.filters[0]).toEqual({
          scope: 'span',
          tag: 'name',
          operator: '=',
          value: ['parent', 'child']
        });
        
        // Parser reports the structural operator as an error
        expect(result!.errors[0].type).toBe('unsupported_structural_operator');
        expect(result!.errors[0].message).toContain('Structural operator');
        expect(result!.errors[0].message).toContain('relationships will be ignored');
      });

      it('should extract basic filters from pipeline aggregations (ignores pipeline)', () => {
        // Pipeline aggregations - parser extracts the filter part
        const query = '{.db.operation="SELECT"} | count() > 3';
        const result = parseTraceQLQuery(query);
        
        // Parser extracts the basic filter, ignoring the aggregation pipeline
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.errors).toHaveLength(1);
        expect(result!.filters[0]).toEqual({
          scope: 'intrinsic',
          tag: 'db.operation',
          operator: '=',
          value: 'SELECT'
        });
        
        // The | count() > 3 pipeline is ignored since Query Builder has no UI for aggregations
      });

      it('should extract basic filters from descendant operators (ignores relationships)', () => {
        // Descendant operators - parser extracts basic filters from both spansets
        const query = '{.region = "eu-west-0"} >> {.region = "eu-west-1"}';
        const result = parseTraceQLQuery(query);
        
        // Parser combines filters with same field into array values
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.errors).toHaveLength(1);
        expect(result!.filters[0]).toEqual({
          scope: 'intrinsic',
          tag: 'region',
          operator: '=',
          value: ['eu-west-0', 'eu-west-1']
        });
        
        // The >> (descendant) relationship is lost, but values are combined into array
      });
    });

    // Tests for edge cases and parser robustness
    describe('Edge cases and robustness', () => {
      it('should handle queries with only valid spanset filters', () => {
        // This parser is specifically designed for basic spanset filters only
        const query = '{resource.service.name="api" && span.http.status_code=200}';
        const result = parseTraceQLQuery(query);
        
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(2);
        expect(result!.errors).toHaveLength(0);
        expect(result!.filters[0].scope).toBe('resource');
        expect(result!.filters[1].scope).toBe('span');
      });

      it('should ignore unsupported TraceQL syntax gracefully', () => {
        // Mixed query with both supported filters and unsupported aggregations
        const query = '{resource.service.name="api"} | count() > 5';
        const result = parseTraceQLQuery(query);
        
        // Should extract the basic filter and ignore the aggregation
        expect(result).not.toBeNull();
        expect(result!.filters).toHaveLength(1);
        expect(result!.errors).toHaveLength(1);
        expect(result!.filters[0]).toEqual({
          scope: 'resource',
          tag: 'service.name',
          operator: '=',
          value: 'api'
        });
      });
    });
  });
});
