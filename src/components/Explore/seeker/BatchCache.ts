import { DataFrame, FieldType } from '@grafana/data';

const BATCH_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 10;

export interface CachedBatch {
  batchId: number;
  from: number;
  to: number;
  data: DataFrame[];
  error?: string;
}

/**
 * Calculates the batch ID for a given timestamp.
 * Batches are 24-hour windows anchored to a reference time.
 */
export function getBatchId(timestamp: number, anchorTime: number): number {
  return Math.floor((timestamp - anchorTime) / BATCH_DURATION_MS);
}

/**
 * Gets the time range for a specific batch ID.
 */
export function getBatchTimeRange(batchId: number, anchorTime: number): { from: number; to: number } {
  const from = anchorTime + batchId * BATCH_DURATION_MS;
  const to = from + BATCH_DURATION_MS;
  return { from, to };
}

/**
 * Gets all batch IDs that cover a given time range.
 */
export function getBatchIdsForRange(from: number, to: number, anchorTime: number): number[] {
  const startBatchId = getBatchId(from, anchorTime);
  const endBatchId = getBatchId(to, anchorTime);

  const batchIds: number[] = [];
  for (let id = startBatchId; id <= endBatchId; id++) {
    batchIds.push(id);
  }
  return batchIds;
}

/**
 * Simple batch data cache that stores loaded batch data.
 */
export class BatchDataCache {
  private cache: Map<number, CachedBatch> = new Map();
  private anchorTime: number;
  private currentMetric: string | null = null;
  private loadingBatchId: number | null = null;

  constructor() {
    this.anchorTime = this.calculateAnchorTime();
  }

  /**
   * Calculate anchor time - we use midnight UTC of today as anchor
   */
  private calculateAnchorTime(): number {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now.getTime();
  }

  /**
   * Clear all cached data (e.g., when metric changes).
   */
  public clearCache(): void {
    this.cache.clear();
    this.loadingBatchId = null;
  }

  /**
   * Check if metric changed and clear cache if needed.
   */
  public checkMetricChange(metric: string): boolean {
    if (this.currentMetric !== metric) {
      this.clearCache();
      this.currentMetric = metric;
      return true;
    }
    return false;
  }

  /**
   * Get the next batch that needs to be loaded for the visible range.
   * Returns null if all batches are loaded.
   * Batches are loaded in descending order (most recent first).
   */
  public getNextBatchToLoad(
    visibleFrom: number,
    visibleTo: number
  ): { batchId: number; from: number; to: number } | null {
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime);
    const now = Date.now();

    // Sort batch IDs in descending order to load most recent batches first
    const sortedBatchIds = [...neededBatchIds].sort((a, b) => b - a);

    for (const batchId of sortedBatchIds) {
      // Skip if already cached or currently loading
      if (this.cache.has(batchId) || this.loadingBatchId === batchId) {
        continue;
      }

      const { from, to } = getBatchTimeRange(batchId, this.anchorTime);

      // Don't fetch future data
      if (from > now) {
        continue;
      }

      // Clamp 'to' to current time
      const clampedTo = Math.min(to, now);

      return { batchId, from, to: clampedTo };
    }

    return null;
  }

  /**
   * Mark a batch as currently loading.
   */
  public setLoadingBatch(batchId: number | null): void {
    this.loadingBatchId = batchId;
  }

  /**
   * Get the currently loading batch ID.
   */
  public getLoadingBatchId(): number | null {
    return this.loadingBatchId;
  }

  /**
   * Store loaded batch data in the cache.
   */
  public storeBatch(batchId: number, from: number, to: number, data: DataFrame[], error?: string): void {
    this.cache.set(batchId, { batchId, from, to, data, error });

    if (this.loadingBatchId === batchId) {
      this.loadingBatchId = null;
    }

    // Enforce cache size limit
    this.enforceCacheLimit();
  }

  /**
   * Store an error for a batch that failed to load.
   */
  public storeBatchError(batchId: number, from: number, to: number, error: string): void {
    this.cache.set(batchId, { batchId, from, to, data: [], error });

    if (this.loadingBatchId === batchId) {
      this.loadingBatchId = null;
    }
  }

  /**
   * Get errors from batches in the visible range.
   */
  public getErrors(visibleFrom: number, visibleTo: number): string[] {
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime);
    const errors: string[] = [];

    for (const batchId of neededBatchIds) {
      const batch = this.cache.get(batchId);
      if (batch?.error) {
        errors.push(batch.error);
      }
    }

    // Return unique errors
    return [...new Set(errors)];
  }

  /**
   * Check if any batch in the visible range has an error.
   */
  public hasErrors(visibleFrom: number, visibleTo: number): boolean {
    return this.getErrors(visibleFrom, visibleTo).length > 0;
  }

  /**
   * Clear errors for all batches (e.g., when retrying).
   */
  public clearErrors(): void {
    for (const [batchId, batch] of this.cache.entries()) {
      if (batch.error) {
        this.cache.delete(batchId);
      }
    }
  }

  /**
   * Get all cached data for the visible range, concatenated.
   */
  public getCachedData(visibleFrom: number, visibleTo: number): DataFrame[] {
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime);
    const allFrames: DataFrame[] = [];

    for (const batchId of neededBatchIds.sort((a, b) => a - b)) {
      const batch = this.cache.get(batchId);
      if (batch?.data) {
        allFrames.push(...batch.data);
      }
    }

    return this.concatenateFrames(allFrames);
  }

  /**
   * Check if all batches for the visible range are loaded.
   */
  public isFullyLoaded(visibleFrom: number, visibleTo: number): boolean {
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime);
    const now = Date.now();

    for (const batchId of neededBatchIds) {
      const { from } = getBatchTimeRange(batchId, this.anchorTime);
      // Skip future batches
      if (from > now) {
        continue;
      }
      if (!this.cache.has(batchId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get loading ranges for UI display.
   */
  public getLoadingRanges(visibleFrom: number, visibleTo: number): Array<{ from: number; to: number }> {
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime);
    const loadingRanges: Array<{ from: number; to: number }> = [];
    const now = Date.now();

    for (const batchId of neededBatchIds) {
      const { from, to } = getBatchTimeRange(batchId, this.anchorTime);

      // Skip future batches
      if (from > now) {
        continue;
      }

      if (!this.cache.has(batchId)) {
        loadingRanges.push({
          from: Math.max(from, visibleFrom),
          to: Math.min(to, now, visibleTo),
        });
      }
    }

    return loadingRanges;
  }

  /**
   * Enforce cache size limit by removing oldest batches.
   */
  private enforceCacheLimit(): void {
    if (this.cache.size <= MAX_CACHE_SIZE) {
      return;
    }

    // Remove oldest batches (lowest batch IDs first)
    const sortedBatchIds = Array.from(this.cache.keys()).sort((a, b) => a - b);
    const toRemove = this.cache.size - MAX_CACHE_SIZE;

    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(sortedBatchIds[i]);
    }
  }

  /**
   * Concatenate multiple DataFrames by merging time series data.
   */
  private concatenateFrames(frames: DataFrame[]): DataFrame[] {
    if (frames.length === 0) {
      return [];
    }

    // Group frames by their field structure (name + type)
    const frameGroups = new Map<string, DataFrame[]>();

    for (const frame of frames) {
      const key = frame.fields.map((f) => `${f.name}:${f.type}`).join('|');
      const group = frameGroups.get(key) || [];
      group.push(frame);
      frameGroups.set(key, group);
    }

    const result: DataFrame[] = [];

    for (const group of frameGroups.values()) {
      if (group.length === 1) {
        result.push(group[0]);
        continue;
      }

      // Sort frames by their first time value
      group.sort((a, b) => {
        const aTime = a.fields.find((f) => f.type === FieldType.time)?.values[0] ?? 0;
        const bTime = b.fields.find((f) => f.type === FieldType.time)?.values[0] ?? 0;
        return aTime - bTime;
      });

      // Merge all values
      const mergedFrame: DataFrame = {
        ...group[0],
        length: 0,
        fields: group[0].fields.map((field) => ({
          ...field,
          values: [],
        })),
      };

      // Collect all time-value pairs and deduplicate
      const timeValueMap = new Map<number, unknown[]>();

      for (const frame of group) {
        const timeField = frame.fields.find((f) => f.type === FieldType.time);
        if (!timeField) {
          continue;
        }

        for (let i = 0; i < frame.length; i++) {
          const time = timeField.values[i];
          if (!timeValueMap.has(time)) {
            timeValueMap.set(
              time,
              frame.fields.map((f) => f.values[i])
            );
          }
        }
      }

      // Sort by time and populate merged frame
      const sortedTimes = Array.from(timeValueMap.keys()).sort((a, b) => a - b);

      for (const time of sortedTimes) {
        const values = timeValueMap.get(time)!;
        for (let fieldIdx = 0; fieldIdx < mergedFrame.fields.length; fieldIdx++) {
          (mergedFrame.fields[fieldIdx].values as unknown[]).push(values[fieldIdx]);
        }
      }

      mergedFrame.length = sortedTimes.length;
      result.push(mergedFrame);
    }

    return result;
  }

  public getAnchorTime(): number {
    return this.anchorTime;
  }
}
