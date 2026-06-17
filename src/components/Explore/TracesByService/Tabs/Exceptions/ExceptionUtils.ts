import { Field } from "@grafana/data";
import { SceneObject } from "@grafana/scenes";

import { calculateBucketSize } from "utils/dates";
import { escapeTraceQlStringLiteral } from "utils/filters-renderer";
import { getDatasourceVariable } from "utils/utils";

const GROUPING_EDGE_LENGTH = 20;
type PlaceholderPattern = {
  token: '<url>' | '<uuid>' | '<ip>' | '<hex>' | '<timestamp>' | '<id>' | '<num>';
  normalizeRegex: RegExp;
  regexFragment: string;
};

const PLACEHOLDER_PATTERNS: PlaceholderPattern[] = [
  {
    token: '<url>',
    normalizeRegex: /\bhttps?:\/\/[^\s]+/gi,
    regexFragment: 'https?://\\S+',
  },
  {
    token: '<uuid>',
    normalizeRegex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    regexFragment: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}',
  },
  {
    token: '<ip>',
    normalizeRegex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    regexFragment: '(?:[0-9]{1,3}\\.){3}[0-9]{1,3}',
  },
  {
    token: '<hex>',
    normalizeRegex: /\b0x[0-9a-f]+\b/gi,
    regexFragment: '0x[0-9a-fA-F]+',
  },
  {
    token: '<timestamp>',
    normalizeRegex: /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g,
    regexFragment: '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?Z?',
  },
  {
    token: '<id>',
    normalizeRegex: /\b([a-z][a-z0-9._-]*id)=([a-z0-9_-]+)\b/gi,
    regexFragment: '[a-zA-Z0-9_-]+',
  },
  {
    token: '<num>',
    normalizeRegex: /\b\d+\b/g,
    regexFragment: '[0-9]+',
  },
];

const PLACEHOLDER_TOKEN_REGEX = new RegExp(`(${PLACEHOLDER_PATTERNS.map((p) => p.token).join('|')})`);

export function aggregateExceptions(messageField: Field<string>, typeField?: Field<string>, timeField?: Field<number>, serviceField?: Field<string>) {
  const occurrences = new Map<string, number>();
  const representativeMessages = new Map<string, string>();
  const groupedMessages = new Map<string, Set<string>>();
  const types = new Map<string, string>();
  const lastSeenTimes = new Map<string, number>();
  const services = new Map<string, string>();
  const timeSeries = new Map<string, Array<{time: number, count: number}>>();
  
  // Collect timestamps for each message
  const messageTimestamps = new Map<string, number[]>();
  
  for (let i = 0; i < messageField.values.length; i++) {
    const message = messageField.values[i];
    const type = typeField?.values[i];
    const timestamp = timeField?.values[i];
    const service = serviceField?.values[i];
    
    if (message) {
      const rawMessage = normalizeRawExceptionMessage(message);
      const normalizedMessage = normalizeExceptionMessage(message);
      if (!normalizedMessage) {
        continue;
      }
      const groupedMessageKey = getExceptionGroupingKey(normalizedMessage, type);
      occurrences.set(groupedMessageKey, (occurrences.get(groupedMessageKey) || 0) + 1);

      if (!representativeMessages.has(groupedMessageKey)) {
        representativeMessages.set(groupedMessageKey, normalizedMessage);
      }

      if (!groupedMessages.has(groupedMessageKey)) {
        groupedMessages.set(groupedMessageKey, new Set<string>());
      }
      if (rawMessage) {
        groupedMessages.get(groupedMessageKey)?.add(rawMessage);
      }
      
      if (!types.has(groupedMessageKey) && type) {
        types.set(groupedMessageKey, type);
      }

      if (!services.has(groupedMessageKey) && service) {
        services.set(groupedMessageKey, service);
      }

      if (timestamp) {
        const timestampMs = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        if (!messageTimestamps.has(groupedMessageKey)) {
          messageTimestamps.set(groupedMessageKey, []);
        }
        messageTimestamps.get(groupedMessageKey)!.push(timestampMs);
                    
        const currentLastSeen = lastSeenTimes.get(groupedMessageKey) || 0;
        if (timestampMs > currentLastSeen) {
          lastSeenTimes.set(groupedMessageKey, timestampMs);
        }
      }
    }
  }

  // Create time series data for each message
  for (const [message, timestamps] of messageTimestamps.entries()) {
    const timeSeriesData = createTimeSeries(timestamps);
    timeSeries.set(message, timeSeriesData);
  }

  const sortedEntries = Array.from(occurrences.entries()).sort((a, b) => b[1] - a[1]);

  return {
    messages: sortedEntries.map(([groupedMessageKey]) => representativeMessages.get(groupedMessageKey) || ''),
    types: sortedEntries.map(([groupedMessageKey]) => types.get(groupedMessageKey) || ''),
    occurrences: sortedEntries.map(([, count]) => count),
    services: sortedEntries.map(([groupedMessageKey]) => services.get(groupedMessageKey) || ''),
    timeSeries: sortedEntries.map(([groupedMessageKey]) => timeSeries.get(groupedMessageKey) || []),
    groupedMessages: sortedEntries.map(([groupedMessageKey]) => Array.from(groupedMessages.get(groupedMessageKey) || [])),
    lastSeenTimes: sortedEntries.map(([groupedMessageKey]) => {
      const lastSeenMs = lastSeenTimes.get(groupedMessageKey);
      
      if (!lastSeenMs) {
        return '';
      }
      
      const now = Date.now();
      const diffMs = now - lastSeenMs;
      
      if (diffMs < 60000) { // Less than 1 minute
        return 'Just now';
      } else if (diffMs < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diffMs / 60000);
        return `${minutes}m ago`;
      } else if (diffMs < 86400000) { // Less than 1 day
        const hours = Math.floor(diffMs / 3600000);
        return `${hours}h ago`;
      } else { // More than 1 day
        const days = Math.floor(diffMs / 86400000);
        return `${days}d ago`;
      }
    }),
  };
}

export function createTimeSeries(timestamps: number[]): Array<{time: number, count: number}> {
  if (!timestamps.length) {return [];}
  
  timestamps.sort((a, b) => a - b);
  
  const timeRangeMs = timestamps[timestamps.length - 1] - timestamps[0];
  const timeRangeSeconds = timeRangeMs / 1000;
  const bucketSizeSeconds = calculateBucketSize(timeRangeSeconds, 50);
  const bucketSizeMs = bucketSizeSeconds * 1000; // Convert back to milliseconds
  const buckets = new Map<number, number>();
  
  for (const timestamp of timestamps) {
    const bucketKey = Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
    buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
  }
  
  // Convert to array and sort by time
  return Array.from(buckets.entries())
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => a.time - b.time);
}

export function normalizeExceptionMessage(message: string): string {
  if (!message) { return '' }
  let normalized = normalizeRawExceptionMessage(message);
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.token === '<id>') {
      normalized = normalized.replace(pattern.normalizeRegex, '$1=<id>');
      continue;
    }
    normalized = normalized.replace(pattern.normalizeRegex, pattern.token);
  }
  return normalized.trim();
}

function normalizeRawExceptionMessage(message: string): string {
  return message.replace(/\s+/g, ' ').trim();
}

export function getExceptionGroupingKey(normalizedMessage: string, type?: string): string {
  const trimmed = normalizedMessage.trim();
  const prefix = trimmed.slice(0, GROUPING_EDGE_LENGTH);
  const suffix = trimmed.slice(-GROUPING_EDGE_LENGTH);
  const messageType = type ?? '';
  return `${messageType}|${prefix}|${suffix}|${trimmed.length}`;
}

/** True when the normalized message uses placeholders that never appear verbatim in Tempo. */
export function normalizedExceptionMessageNeedsRegexMatch(normalizedMessage: string): boolean {
  return PLACEHOLDER_TOKEN_REGEX.test(normalizedMessage);
}

export type ExceptionMessageFilterOperator = '=' | '!=' | '=~' | '!~';

export function getExceptionMessageFilter(
  exceptionMessage: string,
  mode: 'include' | 'exclude'
): { value: string; operator: ExceptionMessageFilterOperator } {
  if (normalizedExceptionMessageNeedsRegexMatch(exceptionMessage)) {
    return {
      value: normalizedExceptionMessageToTraceQLRegexPattern(exceptionMessage),
      operator: mode === 'include' ? '=~' : '!~',
    };
  }

  return {
    value: exceptionMessage,
    operator: mode === 'include' ? '=' : '!=',
  };
}

/** TraceQL filter clause for {@link event.exception.message}. */
export function formatExceptionMessageTraceQLFilter(exceptionMessage: string): string {
  const { operator, value } = getExceptionMessageFilter(exceptionMessage, 'include');
  return `event.exception.message ${operator} "${escapeTraceQlStringLiteral(value)}"`;
}

/**
 * Builds a TraceQL regex pattern (for =~) that matches any raw exception.message
 * consistent with {@link normalizeExceptionMessage}.
 */
export function normalizedExceptionMessageToTraceQLRegexPattern(normalizedMessage: string): string {
  let remaining = normalizedMessage;
  let pattern = '';

  while (remaining.length > 0) {
    let bestIdx = -1;
    let best: PlaceholderPattern | null = null;

    for (const tokenPattern of PLACEHOLDER_PATTERNS) {
      const idx = remaining.indexOf(tokenPattern.token);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        best = tokenPattern;
      }
    }

    if (bestIdx === -1 || !best) {
      pattern += escapeRegexLiteral(remaining);
      break;
    }

    pattern += escapeRegexLiteral(remaining.slice(0, bestIdx));
    pattern += best.regexFragment;
    remaining = remaining.slice(bestIdx + best.token.length);
  }

  return `^${pattern}$`;
}

function escapeRegexLiteral(value: string): string {
  return value
    .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
}

export function getDatasourceUidOrThrow(scene: SceneObject) {
  const datasourceUid = getDatasourceVariable(scene).state.value?.toString();
  if (!datasourceUid) {
    throw new Error('Datasource variable not found');
  }
  return datasourceUid;
}
