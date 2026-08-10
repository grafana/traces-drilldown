import { escapeLabelValue, escapeRegexValue, getStrategy, LOGS_STRATEGIES } from './strategies';

describe('trace to logs strategies', () => {
  const context = { traceId: 'abc123', serviceNames: ['checkout', 'cart'] };

  it('probes the cheapest and most specific shape first and the broad line scan last', () => {
    expect(LOGS_STRATEGIES.map((strategy) => strategy.id)).toEqual([
      'otel-structured-metadata',
      'otlp-gateway-json',
      'job-parsed',
      'line-contains',
    ]);
  });

  it('filters by trace id, which is what the service scoped query on its own failed to do', () => {
    for (const strategy of LOGS_STRATEGIES) {
      expect(strategy.buildTraceExpr(context)).toContain('abc123');
      expect(strategy.buildSpanExpr('abc123')).toContain('abc123');
    }
  });

  it('scopes the trace wide query to every service in the trace', () => {
    expect(getStrategy('otel-structured-metadata')?.buildTraceExpr(context)).toBe(
      '{service_name=~"checkout|cart"} | trace_id="abc123"'
    );
  });

  it('scopes the span query to the row service so each span links to its own logs', () => {
    expect(getStrategy('otel-structured-metadata')?.buildSpanExpr('abc123')).toBe(
      '{service_name="${__data.fields.serviceName}"} | trace_id="abc123"'
    );
  });

  it('matches namespace prefixed jobs for the gateway shapes', () => {
    expect(getStrategy('otlp-gateway-json')?.buildTraceExpr(context)).toBe(
      '{exporter="OTLP", job=~"(.*/)?(checkout|cart)"} | json | traceid="abc123"'
    );
  });

  it('falls back to scanning the line for the trace id', () => {
    expect(getStrategy('line-contains')?.buildTraceExpr(context)).toBe('{service_name=~"checkout|cart"} |= "abc123"');
  });

  it('escapes label values so a quote cannot break out of the matcher', () => {
    expect(escapeLabelValue('we"ird\\one')).toBe('we\\"ird\\\\one');
  });

  it('escapes regex metacharacters in service names', () => {
    expect(escapeRegexValue('cart.v2|old')).toBe('cart\\.v2\\|old');
    expect(getStrategy('otel-structured-metadata')?.buildTraceExpr({ traceId: 'x', serviceNames: ['a.b'] })).toBe(
      '{service_name=~"a\\.b"} | trace_id="x"'
    );
  });

  describe('write back to the Tempo data source', () => {
    it('uses core semantics rather than a custom query where it can', () => {
      expect(getStrategy('otel-structured-metadata')?.toTraceToLogsConfig('loki-uid')).toEqual({
        datasourceUid: 'loki-uid',
        customQuery: false,
        filterByTraceID: true,
        tags: [{ key: 'service.name', value: 'service_name' }],
      });
    });

    it('falls back to a custom query for shapes core cannot express', () => {
      const config = getStrategy('otlp-gateway-json')?.toTraceToLogsConfig('loki-uid');

      expect(config?.customQuery).toBe(true);
      expect(config?.query).toContain('${__span.traceId}');
      expect(config?.datasourceUid).toBe('loki-uid');
    });
  });
});
