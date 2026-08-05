import { parseTraces } from './StructureScene';
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
