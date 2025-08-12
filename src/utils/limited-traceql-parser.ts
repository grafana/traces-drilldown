/**
 * Limited TraceQL parser for extracting filters from raw TraceQL queries.
 * This is a lightweight, regex-based parser specifically designed for the 
 * patterns expected by links.ts contextToLink function.
 * 
 * This parser is designed to minimize bundle entry point size while handling
 * the common TraceQL patterns needed for the traces-drilldown app.
 */

import { TraceqlFilter } from './links';

// Valid scopes for TraceQL fields
const VALID_SCOPES = ['resource', 'span', 'event', 'instrumentation', 'link'];

// Common intrinsic field patterns
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

// Operators that we support
const OPERATORS = ['>=', '<=', '!=', '=~', '!~', '=', '>', '<'];

/**
 * Extract filters from a raw TraceQL query string.
 * This parser handles the basic patterns that links.ts expects:
 * 
 * Examples:
 * - {resource.service.name="my-service"}
 * - {status=error}
 * - {span.http.status_code=200 && resource.service.name="api"}
 * - {span:duration>100ms}
 * 
 * @param query - Raw TraceQL query string
 * @returns Array of TraceqlFilter objects or null if parsing fails
 */
export function parseTraceQLQuery(query: string): TraceqlFilter[] | null {
  if (!query || typeof query !== 'string') {
    return null;
  }

  // Remove comments and normalize whitespace
  const cleanQuery = query
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\s+/g, ' ')
    .trim();

  // Extract all spanset expressions (content within {})
  const spansetMatches = cleanQuery.match(/\{([^}]+)\}/g);
  if (!spansetMatches) {
    return null;
  }

  const filters: TraceqlFilter[] = [];

  for (const spansetMatch of spansetMatches) {
    // Remove the outer braces
    const spansetContent = spansetMatch.slice(1, -1).trim();
    
    // Split by logical operators while preserving them for context
    const conditions = splitByLogicalOperators(spansetContent);
    
    for (const condition of conditions) {
      const filter = parseCondition(condition.trim());
      if (filter) {
        filters.push(filter);
      }
    }
  }

  return filters.length > 0 ? filters : null;
}

/**
 * Split condition string by logical operators (&&, ||)
 * while preserving the individual conditions
 */
function splitByLogicalOperators(content: string): string[] {
  // Split by && or || but keep individual conditions
  const conditions: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    // Handle quotes
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      // Check if it's escaped
      let escapeCount = 0;
      let j = i - 1;
      while (j >= 0 && content[j] === '\\') {
        escapeCount++;
        j--;
      }
      if (escapeCount % 2 === 0) {
        inQuotes = false;
        quoteChar = '';
      }
    }
    
    // Look for logical operators outside of quotes
    if (!inQuotes) {
      if ((char === '&' && nextChar === '&') || (char === '|' && nextChar === '|')) {
        if (current.trim()) {
          conditions.push(current.trim());
          current = '';
        }
        i++; // Skip the next character since we processed it
        continue;
      }
    }
    
    current += char;
  }
  
  if (current.trim()) {
    conditions.push(current.trim());
  }
  
  return conditions;
}

/**
 * Parse a single condition into a TraceqlFilter
 * Examples:
 * - "resource.service.name = 'my-service'"
 * - "status = error"
 * - "span:duration > 100ms"
 */
function parseCondition(condition: string): TraceqlFilter | null {
  // Find the operator in the condition
  let operator = '';
  let operatorIndex = -1;
  
  // Sort operators by length (longest first) to match >= before =
  const sortedOperators = OPERATORS.sort((a, b) => b.length - a.length);
  
  for (const op of sortedOperators) {
    const index = findOperatorIndex(condition, op);
    if (index !== -1) {
      operator = op;
      operatorIndex = index;
      break;
    }
  }
  
  if (!operator || operatorIndex === -1) {
    return null;
  }
  
  const leftPart = condition.slice(0, operatorIndex).trim();
  const rightPart = condition.slice(operatorIndex + operator.length).trim();
  
  if (!leftPart || !rightPart) {
    return null;
  }
  
  // Parse the field (left side)
  const { scope, tag } = parseField(leftPart);
  if (!tag) {
    return null;
  }
  
  // Parse the value (right side)
  const value = parseValue(rightPart);
  if (value === null) {
    return null;
  }
  
  return {
    scope,
    tag,
    operator,
    value
  };
}

/**
 * Find the index of an operator in the condition, avoiding matches inside quotes
 */
function findOperatorIndex(condition: string, operator: string): number {
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i <= condition.length - operator.length; i++) {
    const char = condition[i];
    
    // Handle quotes
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      // Check if it's escaped
      let escapeCount = 0;
      let j = i - 1;
      while (j >= 0 && condition[j] === '\\') {
        escapeCount++;
        j--;
      }
      if (escapeCount % 2 === 0) {
        inQuotes = false;
        quoteChar = '';
      }
    }
    
    // Look for operator outside quotes
    if (!inQuotes && condition.slice(i, i + operator.length) === operator) {
      // Make sure it's not part of a larger operator (e.g., != when looking for =)
      const prevChar = i > 0 ? condition[i - 1] : '';
      const nextChar = i + operator.length < condition.length ? condition[i + operator.length] : '';
      
      // For single character operators, make sure they're not part of multi-char operators
      if (operator.length === 1) {
        if ((operator === '=' && (prevChar === '!' || prevChar === '=' || nextChar === '=' || nextChar === '~')) ||
            (operator === '>' && nextChar === '=') ||
            (operator === '<' && nextChar === '=') ||
            (operator === '!' && nextChar === '=') ||
            (operator === '~' && prevChar === '=')) {
          continue;
        }
      }
      
      return i;
    }
  }
  
  return -1;
}

/**
 * Parse a field reference into scope and tag
 * Examples:
 * - "resource.service.name" -> { scope: "resource", tag: "service.name" }
 * - "status" -> { scope: "intrinsic", tag: "status" }
 * - "span:duration" -> { scope: "span", tag: "duration" }
 */
function parseField(field: string): { scope?: string; tag?: string } {
  // Check if it's an intrinsic field with colon notation
  for (const intrinsic of INTRINSIC_FIELDS) {
    if (field === intrinsic) {
      if (intrinsic.includes(':')) {
        const [scope, tag] = intrinsic.split(':');
        return { scope, tag };
      } else {
        // Legacy intrinsic without scope prefix
        return { scope: 'intrinsic', tag: intrinsic };
      }
    }
  }
  
  // Check for scope.tag pattern
  const dotIndex = field.indexOf('.');
  if (dotIndex > 0) {
    const potentialScope = field.slice(0, dotIndex);
    const remainingTag = field.slice(dotIndex + 1);
    
    // Validate scope
    if (VALID_SCOPES.includes(potentialScope)) {
      return { scope: potentialScope, tag: remainingTag };
    }
  }
  
  // Default to intrinsic if no scope found
  return { scope: 'intrinsic', tag: field };
}

/**
 * Parse a value, handling quotes and different types
 */
function parseValue(value: string): string | string[] | null {
  if (!value) {
    return null;
  }
  
  // Handle quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Handle multiple values separated by | (for regex operators)
  if (value.includes('|') && !value.startsWith('"') && !value.startsWith("'")) {
    return value.split('|').map(v => v.trim()).filter(v => v.length > 0);
  }
  
  return value;
}
