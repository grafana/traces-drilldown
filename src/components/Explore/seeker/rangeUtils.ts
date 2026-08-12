/** Tolerance in ms for treating two time ranges as equal. */
export const TIME_RANGE_TOLERANCE_MS = 1000;

/**
 * Returns true when two time ranges match within `tolerance` milliseconds on
 * both bounds.
 */
export function areRangesEqual(
  a: { from: number; to: number },
  b: { from: number; to: number },
  tolerance = TIME_RANGE_TOLERANCE_MS
): boolean {
  return Math.abs(a.from - b.from) < tolerance && Math.abs(a.to - b.to) < tolerance;
}
