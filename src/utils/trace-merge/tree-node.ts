import { Span } from '../../types';
import { nestedSetLeft, nestedSetRight } from './utils';

export class TreeNode {
  name: string;
  serviceName: string;
  serviceNamespace: string;
  operationName: string;
  spans: Span[];
  left: number;
  right: number;
  children: TreeNode[];
  parent: TreeNode | null;
  traceID: string;

  constructor({
    name,
    serviceName,
    serviceNamespace,
    operationName,
    spans,
    left,
    right,
    traceID,
  }: {
    name: string;
    serviceName: string;
    serviceNamespace: string;
    operationName: string;
    spans: Span[];
    left: number;
    right: number;
    traceID: string;
  }) {
    this.name = name;
    this.serviceName = serviceName;
    this.serviceNamespace = serviceNamespace;
    this.operationName = operationName;
    this.spans = spans;
    this.left = left;
    this.right = right;
    this.children = [];
    this.parent = null;
    this.traceID = traceID;
  }

  addSpan(span: Span) {
    // expand our left/right based on this span
    this.left = Math.min(nestedSetLeft(span), this.left);
    this.right = Math.max(nestedSetRight(span), this.right);
    this.spans.push(span);
  }

  addChild(node: TreeNode) {
    node.parent = this;
    this.children.push(node);
  }

  isChild(span: Span): boolean {
    return nestedSetLeft(span) > this.left && nestedSetRight(span) < this.right;
  }

  findMatchingChild(span: Span): TreeNode | null {
    const name = nodeName(span);

    for (const child of this.children) {
      if (child.name === name) {
        return child;
      }
    }

    return null;
  }
}

export function createNode(s: Span): TreeNode {
  const serviceNameAttr = s.attributes?.find((a) => a.key === 'service.name');
  const serviceNamespaceAttr =
    s.attributes?.find((a) => a.key === 'service.namespace') ??
    s.attributes?.find((a) => a.key === 'service.namespace.name');
  return new TreeNode({
    left: nestedSetLeft(s),
    right: nestedSetRight(s),
    name: nodeName(s),
    serviceName: serviceNameAttr?.value.stringValue ?? serviceNameAttr?.value?.Value?.string_value ?? '',
    serviceNamespace: serviceNamespaceAttr?.value.stringValue ?? serviceNamespaceAttr?.value?.Value?.string_value ?? '',
    operationName: s.name ?? '',
    spans: [s],
    traceID: s.traceId ?? '',
  });
}

function nodeName(s: Span): string {
  let svcName = '';
  let namespace = '';
  for (const a of s.attributes || []) {
    if (a.key === 'service.name') {
      svcName = a.value.stringValue ?? a.value?.Value?.string_value ?? '';
    }
    if (a.key === 'service.namespace' || a.key === 'service.namespace.name') {
      namespace = a.value.stringValue ?? a.value?.Value?.string_value ?? '';
    }
  }
  return `${namespace ? namespace + '/' : ''}${svcName}:${s.name}`;
}
