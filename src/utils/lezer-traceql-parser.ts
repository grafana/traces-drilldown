/**
 * Lezer-based TraceQL parser for extracting filters from raw TraceQL queries.
 * This parser uses the official @grafana/lezer-traceql parser for accurate
 * syntax tree parsing and leverages helper functions from Tempo datasource
 * for consistent filter processing.
 * 
 * SCOPE AND LIMITATIONS:
 * This parser is specifically designed for link generation in traces-drilldown.
 * It extracts basic spanset filters that can be represented as URL parameters.
 * 
 * IMPORTANT: These limitations align with the Tempo Query Builder's capabilities.
 * The Query Builder (SearchTraceQLEditor) also only supports basic filters and
 * combines them with AND logic, making this parser's scope appropriate for
 * handling queries that could realistically come from the Tempo UI.
 * 
 * SUPPORTED TraceQL Features (matches Tempo Query Builder output):
 * - Basic spanset filters: individual TraceqlFilter objects
 * - Intrinsic fields: duration, status, name (from TraceqlSearchScope.Intrinsic)
 * - Scoped attributes: resource.*, span.*, event.*, etc. (from TraceqlSearchScope enum)
 * - Comparison operators: =, !=, >, <, >=, <=, =~, !~ (from operators array)
 * - Logical AND within spansets: Query Builder combines filters with &&
 * - Multiple spansets with AND: Query Builder generates {filter1} && {filter2}
 * - Multiple values per filter: Query Builder creates (field=value1 || field=value2)
 * - Comments in queries: Handled by Lezer parser
 * 
 * NOT SUPPORTED (Valid TraceQL but beyond Query Builder scope):
 * - OR operators between different spansets: {service="A"} || {service="B"}
 *   Reason: Tempo Query Builder only creates individual TraceqlFilter objects
 *   and combines them with AND logic, never creates OR between different fields
 * - Structural operators: {parent} > {child}, {ancestor} >> {descendant}
 *   Reason: Tempo Query Builder has no UI for structural relationships
 * - Pipeline aggregations: {filters} | count() > 5
 *   Reason: Tempo Query Builder focuses on filtering, not aggregation
 * - Union operators: &>, &>>, &<<, &<, &~
 *   Reason: No Query Builder support for complex span relationships
 * 
 * The parser gracefully handles unsupported syntax by extracting only the
 * basic filter components that can be meaningfully represented in URLs.
 */

import { SyntaxNode } from '@lezer/common';
import {
  AttributeField,
  FieldExpression,
  FieldOp,
  IntrinsicField,
  parser,
  SpansetFilter,
  Static,
} from '@grafana/lezer-traceql';

import { TraceqlFilter } from './links';

// Valid scopes for TraceQL fields - copied from Tempo
const VALID_SCOPES = ['resource', 'span', 'event', 'instrumentation', 'link'];

// Common intrinsic field patterns - copied from Tempo
const INTRINSIC_FIELDS = [
  'duration', 'kind', 'name', 'status', 'statusMessage', 'traceDuration',
  'rootName', 'rootServiceName',
  'event:name', 'event:timeSinceStart',
  'instrumentation:name', 'instrumentation:version',
  'link:spanID', 'link:traceID',
  'span:duration', 'span:id', 'span:kind', 'span:name', 'span:parentID', 
  'span:status', 'span:statusMessage',
  'trace:duration', 'trace:id', 'trace:rootName', 'trace:rootService'
];

/**
 * Extract filters from a raw TraceQL query string using the Lezer parser.
 * This provides more accurate parsing than regex-based approaches.
 * 
 * @param query - Raw TraceQL query string
 * @returns Array of TraceqlFilter objects or null if parsing fails
 */
export function parseTraceQLQuery(query: string): TraceqlFilter[] | null {
  if (!query || typeof query !== 'string') {
    return null;
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return null;
  }

  try {
    const tree = parser.parse(cleanQuery);
    const filters: TraceqlFilter[] = [];

    // Walk the syntax tree to find ALL SpansetFilter nodes
    const allSpansetFilters: SyntaxNode[] = [];
    tree.iterate({
      enter: (nodeRef) => {
        if (nodeRef.type.id === SpansetFilter) {
          allSpansetFilters.push(nodeRef.node);
        }
      },
    });

    // Process each SpansetFilter separately
    for (const spansetNode of allSpansetFilters) {
      const spansetFilters = extractFiltersFromSpanset(spansetNode, cleanQuery);
      filters.push(...spansetFilters);
    }

    return filters.length > 0 ? filters : null;
  } catch (error) {
    // If parsing fails completely, return null to fallback gracefully
    return null;
  }
}

/**
 * Extract all filters from a spanset node.
 */
function extractFiltersFromSpanset(spansetNode: SyntaxNode, query: string): TraceqlFilter[] {
  const filters: TraceqlFilter[] = [];
  const processedNodes = new Set<number>(); // Track processed nodes to avoid duplicates

  // Recursively find all FieldExpression nodes within this spanset
  function findFieldExpressions(node: SyntaxNode) {
    // Skip if already processed
    if (processedNodes.has(node.from)) {
      return;
    }

    if (node.type.id === FieldExpression) {
      // Check if this FieldExpression has the structure we want (field = value)
      if (hasFieldOperatorValueStructure(node)) {
        const filter = extractFilterFromFieldExpression(node, query);
        if (filter) {
          filters.push(filter);
          processedNodes.add(node.from);
        }
      } else {
        // Check if this is a simple field=value expression (without nested structure)
        const filter = extractSimpleFieldExpression(node, query);
        if (filter) {
          filters.push(filter);
          processedNodes.add(node.from);
        }
      }
    }

    // Also check for error cases where field name is split
    // This handles cases like "service.name=~..." where "service" becomes an error node
    if (node.type.id === 0) { // Error node
      // Check if there's a FieldExpression sibling that might be the rest of the expression
      const parent = node.parent;
      if (parent && parent.type.id === SpansetFilter) {
        const errorText = getNodeText(node, query);
        const nextSibling = node.nextSibling;
        
        if (nextSibling && nextSibling.type.id === FieldExpression && !processedNodes.has(nextSibling.from)) {
          // Try to reconstruct the full field expression
          const siblingText = getNodeText(nextSibling, query);
          const fullExpression = errorText + siblingText;
          
          // Try to parse this as a complete filter using regex fallback
          const regexFilter = parseWithRegexFallback(fullExpression);
          if (regexFilter) {
            filters.push(regexFilter);
            processedNodes.add(node.from);
            processedNodes.add(nextSibling.from); // Mark sibling as processed too
            return; // Don't process the sibling again
          }
        }
      }
    }

    // Recursively check children
    const cursor = node.cursor();
    if (cursor.firstChild()) {
      do {
        findFieldExpressions(cursor.node);
      } while (cursor.nextSibling());
    }
  }

  findFieldExpressions(spansetNode);
  return filters;
}

/**
 * Check if a FieldExpression has the structure: field operator value
 * Based on the debug output, the structure is:
 * FieldExpression -> [FieldExpression(field), FieldOp, FieldExpression(value)]
 */
function hasFieldOperatorValueStructure(node: SyntaxNode): boolean {
  let hasFieldExpression = 0;
  let hasOperator = false;

  const cursor = node.cursor();
  if (cursor.firstChild()) {
    do {
      const child = cursor.node;
      if (child.type.id === FieldExpression) {
        hasFieldExpression++;
      } else if (child.type.id === FieldOp) {
        hasOperator = true;
      }
    } while (cursor.nextSibling());
  }

  // We expect exactly 2 FieldExpressions (field and value) and 1 FieldOp
  return hasFieldExpression === 2 && hasOperator;
}

/**
 * Extract a simple field expression that has direct field, operator, value children.
 * This handles cases like individual conditions in OR expressions.
 */
function extractSimpleFieldExpression(node: SyntaxNode, query: string): TraceqlFilter | null {
  let fieldNode: SyntaxNode | null = null;
  let operatorNode: SyntaxNode | null = null;
  let valueNode: SyntaxNode | null = null;

  // Walk through direct children
  const cursor = node.cursor();
  if (cursor.firstChild()) {
    do {
      const child = cursor.node;
      if (child.type.id === IntrinsicField || child.type.id === AttributeField) {
        fieldNode = child;
      } else if (child.type.id === FieldOp) {
        operatorNode = child;
      } else if (child.type.id === Static) {
        valueNode = child;
      }
    } while (cursor.nextSibling());
  }

  if (!fieldNode || !operatorNode || !valueNode) {
    return null;
  }

  // Extract text content from nodes
  const fieldText = getNodeText(fieldNode, query);
  const operatorText = getNodeText(operatorNode, query);
  const valueText = getNodeText(valueNode, query);

  // Parse field into scope and tag
  const { scope, tag } = parseField(fieldText);
  if (!tag) {
    return null;
  }

  // Parse value (handle quotes and escaping)
  const value = parseValue(valueText);
  if (value === null) {
    return null;
  }

  return {
    scope,
    tag,
    operator: operatorText,
    value,
  };
}

/**
 * Extract a single filter from a FieldExpression node.
 * The structure is: FieldExpression -> [FieldExpression(field), FieldOp, FieldExpression(value)]
 */
function extractFilterFromFieldExpression(node: SyntaxNode, query: string): TraceqlFilter | null {
  let fieldText = '';
  let operatorText = '';
  let valueText = '';

  // Walk through direct children
  const cursor = node.cursor();
  if (cursor.firstChild()) {
    do {
      const child = cursor.node;
      if (child.type.id === FieldExpression) {
        // This could be either the field or the value FieldExpression
        const childText = getNodeText(child, query);
        
        // Check if this FieldExpression contains an AttributeField or IntrinsicField
        if (containsField(child)) {
          fieldText = childText;
        } else if (containsValue(child)) {
          valueText = childText;
        }
      } else if (child.type.id === FieldOp) {
        operatorText = getNodeText(child, query);
      }
    } while (cursor.nextSibling());
  }

  if (!fieldText || !operatorText || !valueText) {
    return null;
  }

  // Parse field into scope and tag
  const { scope, tag } = parseField(fieldText);
  if (!tag) {
    return null;
  }

  // Parse value (handle quotes and escaping)
  const value = parseValue(valueText);
  if (value === null) {
    return null;
  }

  return {
    scope,
    tag,
    operator: operatorText,
    value,
  };
}

/**
 * Check if a node contains a field (AttributeField or IntrinsicField)
 */
function containsField(node: SyntaxNode): boolean {
  let hasField = false;
  
  function checkNode(n: SyntaxNode) {
    if (n.type.id === AttributeField || n.type.id === IntrinsicField) {
      hasField = true;
      return;
    }
    
    const cursor = n.cursor();
    if (cursor.firstChild()) {
      do {
        checkNode(cursor.node);
      } while (cursor.nextSibling() && !hasField);
    }
  }
  
  checkNode(node);
  return hasField;
}

/**
 * Check if a node contains a value (Static)
 */
function containsValue(node: SyntaxNode): boolean {
  let hasValue = false;
  
  function checkNode(n: SyntaxNode) {
    if (n.type.id === Static) {
      hasValue = true;
      return;
    }
    
    const cursor = n.cursor();
    if (cursor.firstChild()) {
      do {
        checkNode(cursor.node);
      } while (cursor.nextSibling() && !hasValue);
    }
  }
  
  checkNode(node);
  return hasValue;
}

/**
 * Extract text content from a syntax node.
 * Adapted from Tempo's situation.ts
 */
function getNodeText(node: SyntaxNode, text: string): string {
  return text.slice(node.from, node.to);
}

/**
 * Parse a field reference into scope and tag.
 * Adapted from Tempo's logic and the limited parser.
 */
function parseField(field: string): { scope?: string; tag?: string } {
  // Clean up the field text - remove leading dots if present
  const cleanField = field.startsWith('.') ? field.slice(1) : field;
  
  // Check if it's an intrinsic field with colon notation
  for (const intrinsic of INTRINSIC_FIELDS) {
    if (cleanField === intrinsic) {
      if (intrinsic.includes(':')) {
        const [scope, tag] = intrinsic.split(':');
        return { scope, tag };
      } else {
        // Legacy intrinsic without scope prefix
        return { scope: 'intrinsic', tag: intrinsic };
      }
    }
  }

  // Check for scope.tag pattern (only if it's a valid scope)
  const dotIndex = cleanField.indexOf('.');
  if (dotIndex > 0) {
    const potentialScope = cleanField.slice(0, dotIndex);
    const remainingTag = cleanField.slice(dotIndex + 1);

    // Validate scope - only split if it's a valid TraceQL scope
    if (VALID_SCOPES.includes(potentialScope)) {
      return { scope: potentialScope, tag: remainingTag };
    }
  }

  // If no valid scope found, treat the entire field as an intrinsic tag
  // This handles cases like "service.name" which should be intrinsic with tag "service.name"
  return { scope: 'intrinsic', tag: cleanField };
}

/**
 * Parse a value, handling quotes and different types.
 * Adapted from the limited parser.
 */
function parseValue(value: string): string | string[] | null {
  if (!value) {
    return null;
  }

  // Handle quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    const unquoted = value.slice(1, -1);
    // Handle escape sequences
    return unquoted.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }

  // Handle multiple values separated by | (for regex operators)
  if (value.includes('|') && !value.startsWith('"') && !value.startsWith("'")) {
    return value.split('|').map(v => v.trim()).filter(v => v.length > 0);
  }

  return value;
}

/**
 * Fallback regex parser for cases where Lezer parser fails due to invalid scopes.
 * Uses the same logic as the limited parser for these edge cases.
 */
function parseWithRegexFallback(expression: string): TraceqlFilter | null {
  // Simple regex to extract field, operator, and value
  const match = expression.match(/^([^=!<>~]+)(>=|<=|!=|=~|!~|=|>|<)(.+)$/);
  if (!match) {
    return null;
  }

  const [, fieldPart, operator, valuePart] = match;
  const field = fieldPart.trim();
  const value = parseValue(valuePart.trim());

  if (!field || !value) {
    return null;
  }

  const { scope, tag } = parseField(field);
  if (!tag) {
    return null;
  }

  return {
    scope,
    tag,
    operator,
    value,
  };
}

/**
 * Helper function to determine if a filter is an intrinsic field.
 * Adapted from Tempo's SearchTraceQLEditor/utils.ts
 */
function isIntrinsic(filter: TraceqlFilter): boolean {
  const intrinsics = [
    'event:name',
    'event:timeSinceStart', 
    'instrumentation:name',
    'instrumentation:version',
    'link:spanID',
    'link:traceID',
    'span:duration',
    'span:id',
    'span:kind',
    'span:name',
    'span:status',
    'span:statusMessage',
    'trace:duration',
    'trace:id',
    'trace:rootName',
    'trace:rootService',
  ].map((fullName) => {
    const [scope, tag] = fullName.split(':');
    return { scope, tag };
  });

  return intrinsics.some((intrinsic) => intrinsic.tag === filter.tag && intrinsic.scope === filter.scope);
}

/**
 * Get the appropriate separator for a filter (: for intrinsics, . for attributes).
 * Adapted from Tempo's SearchTraceQLEditor/utils.ts
 */
export function getScopeSeparator(filter: TraceqlFilter): string {
  return isIntrinsic(filter) ? ':' : '.';
}
