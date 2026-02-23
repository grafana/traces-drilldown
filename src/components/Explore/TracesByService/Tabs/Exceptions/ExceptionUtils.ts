import { Field } from "@grafana/data";
import { SceneObject } from "@grafana/scenes";

import { calculateBucketSize } from "utils/dates";
import { getDatasourceVariable } from "utils/utils";

export function aggregateExceptions(messageField: Field<string>, typeField?: Field<string>, timeField?: Field<number>, serviceField?: Field<string>) {
  const occurrences = new Map<string, number>();
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
      const normalizedMessage = normalizeExceptionMessage(message);
      occurrences.set(normalizedMessage, (occurrences.get(normalizedMessage) || 0) + 1);
      
      if (!types.has(normalizedMessage) && type) {
        types.set(normalizedMessage, type);
      }

      if (!services.has(normalizedMessage) && service) {
        services.set(normalizedMessage, service);
      }

      if (timestamp) {
        const timestampMs = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        if (!messageTimestamps.has(normalizedMessage)) {
          messageTimestamps.set(normalizedMessage, []);
        }
        messageTimestamps.get(normalizedMessage)!.push(timestampMs);
                    
        const currentLastSeen = lastSeenTimes.get(normalizedMessage) || 0;
        if (timestampMs > currentLastSeen) {
          lastSeenTimes.set(normalizedMessage, timestampMs);
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
    messages: sortedEntries.map(([message]) => message),
    types: sortedEntries.map(([message]) => types.get(message) || ''),
    occurrences: sortedEntries.map(([, count]) => count),
    services: sortedEntries.map(([message]) => services.get(message) || ''),
    timeSeries: sortedEntries.map(([message]) => timeSeries.get(message) || []),
    lastSeenTimes: sortedEntries.map(([message]) => {
      const lastSeenMs = lastSeenTimes.get(message);
      
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
  return message.replace(/\s+/g, ' ').trim();
}

export function escapeTraceQlString(value: string) {
  return value.replace(/["\\]/g, (s) => `\\${s}`);
}

export function getDatasourceUidOrThrow(scene: SceneObject) {
  const datasourceUid = getDatasourceVariable(scene).state.value?.toString();
  if (!datasourceUid) {
    throw new Error('Datasource variable not found');
  }
  return datasourceUid;
}
