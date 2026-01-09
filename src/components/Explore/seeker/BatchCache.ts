import { DataFrame, FieldType } from '@grafana/data';

// Maximum number of batches to keep in cache
// Large enough to accommodate very zoomed-out visible ranges
const MAX_CACHE_SIZE = 250;

// Threshold for showing a performance warning
// When more than this many batches need to be loaded, we warn the user
const LARGE_BATCH_COUNT_THRESHOLD = 50;

export interface CachedBatch {
  batchId: number;
  from: number;
  to: number;
  data: DataFrame[];
  error?: string;
}

/**
 * Calculates the batch ID for a given timestamp.
 * Batches are time windows anchored to a reference time.
 */
export function getBatchId(timestamp: number, anchorTime: number, batchDurationMs: number): number {
  return Math.floor((timestamp - anchorTime) / batchDurationMs);
}

export function getBatchTimeRange(
  batchId: number,
  anchorTime: number,
  batchDurationMs: number
): { from: number; to: number } {
  const from = anchorTime + batchId * batchDurationMs;
  const to = from + batchDurationMs;
  return { from, to };
}

export function getBatchIdsForRange(from: number, to: number, anchorTime: number, batchDurationMs: number): number[] {
  const startBatchId = getBatchId(from, anchorTime, batchDurationMs);
  const endBatchId = getBatchId(to, anchorTime, batchDurationMs);

  const batchIds: number[] = [];
  for (let id = startBatchId; id <= endBatchId; id++) {
    batchIds.push(id);
  }
  return batchIds;
}

export class BatchDataCache {
  private cache: Map<number, CachedBatch> = new Map();
  private anchorTime: number;
  private currentMetric: string | null = null;
  private loadingBatchId: number | null = null;
  private batchDurationMs: number;
  private lastVisibleRange: { from: number; to: number } | null = null;
  private hasLargeBatchCount = false;

  constructor(batchDurationHours: number) {
    this.anchorTime = this.calculateAnchorTime();
    this.batchDurationMs = batchDurationHours * 60 * 60 * 1000;
  }

  public hasLargeBatchWarning(): boolean {
    return this.hasLargeBatchCount;
  }

  private calculateAnchorTime(): number {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now.getTime();
  }

  public clearCache(): void {
    this.cache.clear();
    this.loadingBatchId = null;
  }

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
    // Track the visible range for cache eviction policy
    this.lastVisibleRange = { from: visibleFrom, to: visibleTo };

    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime, this.batchDurationMs);
    const now = Date.now();

    // Sort batch IDs in descending order to load most recent batches first
    const sortedBatchIds = [...neededBatchIds].sort((a, b) => b - a);

    // Track if we have a large number of batches (for performance warning)
    this.hasLargeBatchCount = neededBatchIds.length > LARGE_BATCH_COUNT_THRESHOLD;

    for (const batchId of sortedBatchIds) {
      // Skip if already cached or currently loading
      if (this.cache.has(batchId) || this.loadingBatchId === batchId) {
        continue;
      }

      const { from, to } = getBatchTimeRange(batchId, this.anchorTime, this.batchDurationMs);

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

    // Enforce cache size limit, but protect the batch we just stored
    this.enforceCacheLimit(batchId);
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
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime, this.batchDurationMs);
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
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime, this.batchDurationMs);
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
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime, this.batchDurationMs);
    const now = Date.now();

    for (const batchId of neededBatchIds) {
      const { from } = getBatchTimeRange(batchId, this.anchorTime, this.batchDurationMs);
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
    const neededBatchIds = getBatchIdsForRange(visibleFrom, visibleTo, this.anchorTime, this.batchDurationMs);
    const loadingRanges: Array<{ from: number; to: number }> = [];
    const now = Date.now();

    for (const batchId of neededBatchIds) {
      const { from, to } = getBatchTimeRange(batchId, this.anchorTime, this.batchDurationMs);

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
   * Enforce cache size limit by removing batches furthest from the visible range.
   * This ensures we keep batches that are most likely to be needed.
   * @param protectedBatchId - Batch ID that should never be evicted (typically the one just stored)
   */
  private enforceCacheLimit(protectedBatchId?: number): void {
    if (this.cache.size <= MAX_CACHE_SIZE) {
      return;
    }

    // If we don't have a visible range yet, fall back to removing oldest batches
    if (!this.lastVisibleRange) {
      const sortedBatchIds = Array.from(this.cache.keys())
        .filter((id) => id !== protectedBatchId)
        .sort((a, b) => a - b);
      const toRemove = this.cache.size - MAX_CACHE_SIZE;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedBatchIds[i]);
      }
      return;
    }

    // Calculate the center of the visible range
    const visibleCenter = (this.lastVisibleRange.from + this.lastVisibleRange.to) / 2;

    // Sort batches by distance from visible center (furthest first), excluding protected batch
    const sortedBatchIds = Array.from(this.cache.keys())
      .filter((id) => id !== protectedBatchId)
      .sort((a, b) => {
        const aCenter = this.anchorTime + (a + 0.5) * this.batchDurationMs;
        const bCenter = this.anchorTime + (b + 0.5) * this.batchDurationMs;
        const aDistance = Math.abs(aCenter - visibleCenter);
        const bDistance = Math.abs(bCenter - visibleCenter);
        return bDistance - aDistance; // Sort descending (furthest first)
      });

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
