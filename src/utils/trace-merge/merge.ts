import { TraceSearchMetadata } from '../../types';
import { createNode, TreeNode } from './tree-node';
import { nestedSetLeft } from './utils';

export function mergeTraces(traces: TraceSearchMetadata[]): TreeNode {
  const tree = new TreeNode({
    name: 'root',
    serviceName: '',
    serviceNamespace: '',
    operationName: '',
    left: Number.MIN_SAFE_INTEGER,
    right: Number.MAX_SAFE_INTEGER,
    spans: [],
    traceID: '',
  });

  if (traces && traces.length > 0) {
    for (const trace of traces) {
      if (trace.spanSets?.length !== 1) {
        throw new Error('there should be only 1 spanset!');
      }

      const traceStartTime = parseInt(trace.startTimeUnixNano || '0', 10);

      const ss = trace.spanSets[0];
      // sort by nestedSetLeft
      ss.spans.sort((s1, s2) => nestedSetLeft(s1) - nestedSetLeft(s2));

      // reset curNode to root each loop to re-overlay the next trace
      let curNode: TreeNode = tree;
      // left/right is only valid w/i a trace, so reset it each loop
      resetLeftRight(tree);
      for (const span of ss.spans) {
        // force traceID to be the same for all spans in a trace
        span.traceId = trace.traceID;
        span.startTimeUnixNano = `${parseInt(span.startTimeUnixNano, 10) - traceStartTime}`;

        // walk up the tree until we find a node that is a parent of this span
        while (curNode.parent !== null) {
          if (curNode.isChild(span)) {
            break;
          }
          curNode = curNode.parent;
        }

        // is there an already existing child that matches the span?
        const child = curNode.findMatchingChild(span);
        if (child) {
          child.addSpan(span);
          // to the next span!
          curNode = child;
          continue;
        }

        // if not, create a new child node and make it the cur node
        const newNode = createNode(span);
        newNode.traceID = trace.traceID;
        curNode.addChild(newNode);
        curNode = newNode;
      }
    }
  }

  return tree;
}

export function dumpTree(t: TreeNode, depth: number): string {
  let result = '';
  const space = ' '.repeat(depth * 2);

  result += `${space}${t.name} ${t.spans.length}\n`;

  for (const c of t.children) {
    result += dumpTree(c, depth + 1);
  }
  return result;
}

function resetLeftRight(t: TreeNode) {
  t.left = Number.MAX_SAFE_INTEGER;
  t.right = Number.MIN_SAFE_INTEGER;

  for (const c of t.children) {
    resetLeftRight(c);
  }
}
