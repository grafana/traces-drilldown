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

  let primaryValue = Math.floor(duration / primaryUnit.microseconds);
  let secondaryValue = (duration / secondaryUnit.microseconds) % primaryUnit.ofPrevious;
  const secondaryValueRounded = Math.round(secondaryValue);

  // Handle rollover case before rounding (e.g., 60s should become 1m, not 0m 60s)
  if (secondaryValueRounded === primaryUnit.ofPrevious) {
    primaryValue += 1;
    secondaryValue = 0;
  } else {
    secondaryValue = secondaryValueRounded;
  }

  const primaryUnitString = `${primaryValue}${primaryUnit.unit}`;

  if (secondaryValue === 0) {
    return primaryUnitString;
  }

  const secondaryUnitString = `${secondaryValue}${secondaryUnit.unit}`;
  return `${primaryUnitString} ${secondaryUnitString}`;
}

export const getStepForTimeRange = (scene: SceneObject, dataPoints?: number) => {
  const sceneTimeRange = sceneGraph.getTimeRange(scene);
  const from = sceneTimeRange.state.value.from.unix();
  const to = sceneTimeRange.state.value.to.unix();

  const dur = duration(to - from, 's');
  const finalDur = Math.floor(dur.asSeconds() / (dataPoints ?? 50)) || 1;
  return `${finalDur}s`;
}
