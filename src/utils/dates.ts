import { dropWhile as _dropWhile, round as _round } from 'lodash';
import { sceneGraph, SceneObject } from '@grafana/scenes';
import { duration } from 'moment/moment';

export const ONE_MILLISECOND = 1000;
export const ONE_SECOND = 1000 * ONE_MILLISECOND;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;
export const DEFAULT_MS_PRECISION = Math.log10(ONE_MILLISECOND);

const UNIT_STEPS: Array<{ unit: string; microseconds: number; ofPrevious: number }> = [
  { unit: 'd', microseconds: ONE_DAY, ofPrevious: 24 },
  { unit: 'h', microseconds: ONE_HOUR, ofPrevious: 60 },
  { unit: 'm', microseconds: ONE_MINUTE, ofPrevious: 60 },
  { unit: 's', microseconds: ONE_SECOND, ofPrevious: 1000 },
  { unit: 'ms', microseconds: ONE_MILLISECOND, ofPrevious: 1000 },
  { unit: 'μs', microseconds: 1, ofPrevious: 1000 },
];

/**
 * Humanizes the duration for display.
 *
 * Example:
 * 5000ms => 5s
 * 1000μs => 1ms
 * 183840s => 2d 3h
 *
 * @param {number} duration (in microseconds)
 * @return {string} formatted duration
 */
export const formatDuration = (duration: number): string => {
  // Drop all units that are too large except the last one
  const [primaryUnit, secondaryUnit] = _dropWhile(
    UNIT_STEPS,
    ({ microseconds }, index) => index < UNIT_STEPS.length - 1 && microseconds > duration
  );

  if (primaryUnit.ofPrevious === 1000) {
    // If the unit is decimal based, display as a decimal
    return `${_round(duration / primaryUnit.microseconds, 2)}${primaryUnit.unit}`;
  }

  const primaryValue = Math.floor(duration / primaryUnit.microseconds);
  const primaryUnitString = `${primaryValue}${primaryUnit.unit}`;
  const secondaryValue = Math.round((duration / secondaryUnit.microseconds) % primaryUnit.ofPrevious);
  const secondaryUnitString = `${secondaryValue}${secondaryUnit.unit}`;
  return secondaryValue === 0 ? primaryUnitString : `${primaryUnitString} ${secondaryUnitString}`;
}

/**
 * Calculate bucket size based on time range and desired number of data points
 * @param timeRangeSeconds - The time range in seconds
 * @param dataPoints - Desired number of data points (default: 50)
 * @returns Bucket size in seconds
 */
export const calculateBucketSize = (timeRangeSeconds: number, dataPoints = 50): number => {
  return Math.floor(timeRangeSeconds / dataPoints) || 1;
};

export const getStepForTimeRange = (scene: SceneObject, dataPoints?: number) => {
  const sceneTimeRange = sceneGraph.getTimeRange(scene);
  const from = sceneTimeRange.state.value.from.unix();
  const to = sceneTimeRange.state.value.to.unix();

  const dur = duration(to - from, 's');
  const bucketSizeSeconds = calculateBucketSize(dur.asSeconds(), dataPoints);
  return `${bucketSizeSeconds}s`;
}
