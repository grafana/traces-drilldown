import { dumpTree, mergeTraces } from './merge';
import { createNode } from './tree-node';
import { SearchResponse } from '../../types';

import serviceStructResponse from './test-responses/service-struct.json';
import serviceStructWithNamespaceResponse from './test-responses/service-struct-with-namespace.json';

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

describe('service.namespace support', () => {
  it('same service.name with different namespace produces separate tree nodes', () => {
    const mockResponse = serviceStructWithNamespaceResponse as unknown as SearchResponse;
    const tree = mergeTraces(mockResponse.traces);
    const treeDump = dumpTree(tree, 0);

    expect(treeDump).toContain('namespace-1/Service-A:HTTP POST');
    expect(treeDump).toContain('namespace-2/Service-A:HTTP POST');
    expect(treeDump).toContain('Service-C:HTTP GET');
  });

  it('span without namespace produces plain serviceName with no slash prefix', () => {
    const span = {
      spanID: 'test0001',
      name: 'HTTP GET',
      startTimeUnixNano: '0',
      durationNanos: '1000',
      attributes: [
        { key: 'service.name', value: { stringValue: 'Service-C' } },
        { key: 'nestedSetLeft', value: { intValue: '1' } },
        { key: 'nestedSetRight', value: { intValue: '2' } },
        { key: 'nestedSetParent', value: { intValue: '-1' } },
      ],
    };
    const node = createNode(span as any);
    expect(node.serviceName).toBe('Service-C');
    expect(node.serviceNamespace).toBe('');
    expect(node.name).toBe('Service-C:HTTP GET');
  });

  it('createNode with service.namespace attr sets serviceNamespace correctly', () => {
    const span = {
      spanID: 'test0002',
      name: 'HTTP POST',
      startTimeUnixNano: '0',
      durationNanos: '1000',
      attributes: [
        { key: 'service.name', value: { stringValue: 'Service-A' } },
        { key: 'service.namespace', value: { stringValue: 'namespace-1' } },
        { key: 'nestedSetLeft', value: { intValue: '1' } },
        { key: 'nestedSetRight', value: { intValue: '2' } },
        { key: 'nestedSetParent', value: { intValue: '-1' } },
      ],
    };
    const node = createNode(span as any);
    expect(node.serviceNamespace).toBe('namespace-1');
    expect(node.name).toBe('namespace-1/Service-A:HTTP POST');
  });

  it('createNode with service.namespace.name attr (Prometheus fallback) sets serviceNamespace correctly', () => {
    const span = {
      spanID: 'test0003',
      name: 'HTTP POST',
      startTimeUnixNano: '0',
      durationNanos: '1000',
      attributes: [
        { key: 'service.name', value: { stringValue: 'Service-A' } },
        { key: 'service.namespace.name', value: { stringValue: 'namespace-prom' } },
        { key: 'nestedSetLeft', value: { intValue: '1' } },
        { key: 'nestedSetRight', value: { intValue: '2' } },
        { key: 'nestedSetParent', value: { intValue: '-1' } },
      ],
    };
    const node = createNode(span as any);
    expect(node.serviceNamespace).toBe('namespace-prom');
    expect(node.name).toBe('namespace-prom/Service-A:HTTP POST');
  });
});
