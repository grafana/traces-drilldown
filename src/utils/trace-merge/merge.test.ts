import { dumpTree, mergeTraces } from './merge';
import { SearchResponse } from '../../types';

import serviceStructResponse from './test-responses/service-struct.json';

describe('mergeTraces', () => {
  beforeEach(() => {
    global.console = require('console');
  });

  it('should not throw an error when a trace has exactly one span set', () => {
    const mockResponse = serviceStructResponse as SearchResponse;
    expect(() => mergeTraces(mockResponse.traces)).not.toThrow();
  });

  it('should correctly output a tree', () => {
    const mockResponse = serviceStructResponse as SearchResponse;
    const tree = mergeTraces(mockResponse.traces);
    const treeDump = dumpTree(tree, 0);

    expect(treeDump).toMatch(
      'root 0\n' +
        '  Service-A:HTTP POST 11\n' +
        '    Service-B:cardinality_estimation 1\n' +
        '      Service-B:querysharding 1\n' +
        '    Service-B:step_align 1\n' +
        '      Service-B:split_by_interval_and_results_cache 1\n' +
        '  Service-C:HTTP GET 37\n' +
        '  Service-D:Span-name-PQR 106\n' +
        '  Service-E:Span-name-XYZ 3\n' +
        '  Service-F:HTTP Outgoing Request 1\n'
    );
  });
});
