import { buildQuery, parseTraces } from './StructureScene';
import { dumpTree, mergeTraces } from '../../../../../utils/trace-merge/merge';
import { SearchResponse } from '../../../../../types';

import serviceStructResponse from '../../../../../utils/trace-merge/test-responses/service-struct.json';

describe('parseTraces', () => {
  const response = serviceStructResponse as SearchResponse;

  it('parses a frame containing a SearchResponse object', () => {
    const frame = JSON.stringify(response);

    expect(parseTraces(frame)).toEqual(response.traces);
  });

  it('parses a frame containing a raw TraceSearchMetadata[] array', () => {
    const frame = JSON.stringify(response.traces);

    expect(parseTraces(frame)).toEqual(response.traces);
  });

  it('returns an empty array when a SearchResponse has no traces', () => {
    const frame = JSON.stringify({ metrics: {} });

    expect(parseTraces(frame)).toEqual([]);
  });

  it('produces the same merged tree regardless of frame shape', () => {
    const fromResponse = mergeTraces(parseTraces(JSON.stringify(response)));
    const fromArray = mergeTraces(parseTraces(JSON.stringify(response.traces)));

    expect(dumpTree(fromArray, 0)).toEqual(dumpTree(fromResponse, 0));
  });
});

describe('buildQuery', () => {
  const baseFields = {
    refId: 'A',
    queryType: 'traceql',
    tableType: 'raw',
    limit: 200,
    spss: 20,
    filters: [],
  };

  it('should build a rate query filtering on server spans', () => {
    const expected =
      '({${primarySignal} && ${filters} } &>> { kind = server }) || ({${primarySignal} && ${filters} }) | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)';

    const result = buildQuery('rate', '', '');

    expect(result).toEqual({ ...baseFields, query: expected });
  });

  it('should build an errors query filtering on error status', () => {
    const expected =
      '({${primarySignal} && ${filters} && status = error} &>> { status = error }) || ({${primarySignal} && ${filters} && status = error}) | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)';

    const result = buildQuery('errors', '', '');

    expect(result).toEqual({ ...baseFields, query: expected });
  });

  it('should build a duration query with no thresholds set', () => {
    const expected =
      '({${primarySignal} && ${filters} } &>> { true }) || ({${primarySignal} && ${filters} }) | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)';

    const result = buildQuery('duration', '', '');

    expect(result).toEqual({ ...baseFields, query: expected });
  });

  it('should build a duration query using only the partial latency threshold', () => {
    const expected =
      '({${primarySignal} && ${filters} } &>> { duration > ${partialLatencyThreshold} }) || ({${primarySignal} && ${filters} }) | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)';

    const result = buildQuery('duration', '100ms', '');

    expect(result).toEqual({ ...baseFields, query: expected });
  });

  it('should build a duration query using only the latency threshold', () => {
    const expected =
      '({${primarySignal} && ${filters} && duration > ${latencyThreshold}} &>> { true }) || ({${primarySignal} && ${filters} && duration > ${latencyThreshold}}) | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)';

    const result = buildQuery('duration', '', '200ms');

    expect(result).toEqual({ ...baseFields, query: expected });
  });

  it('should build a duration query using both latency thresholds', () => {
    const expected =
      '({${primarySignal} && ${filters} && duration > ${latencyThreshold}} &>> { duration > ${partialLatencyThreshold} }) || ({${primarySignal} && ${filters} && duration > ${latencyThreshold}}) | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)';

    const result = buildQuery('duration', '100ms', '200ms');

    expect(result).toEqual({ ...baseFields, query: expected });
  });
});
