import { GrafanaTheme2 } from '@grafana/data';
import { MetricFunction } from 'utils/shared';

/**
 * Grafana visualization palette name for a metric series.
 * Rate is neutral throughput (all statuses) → blue. Duration → semi-dark-blue.
 * Errors → semi-dark-red. Green is reserved for an explicit success signal — do not
 * use it for rate/throughput.
 */
export function getMetricColorName(metric?: MetricFunction): string {
  if (metric === 'duration') {
    return 'semi-dark-blue';
  }
  if (metric === 'errors') {
    return 'semi-dark-red';
  }
  return 'blue';
}

export function getMetricColor(theme: GrafanaTheme2, metric?: MetricFunction): string {
  return theme.visualization.getColorByName(getMetricColorName(metric));
}

type ColorOverrides = {
  matchFieldsWithNameByRegex: (regex: string) => {
    overrideColor: (color: { mode: 'fixed'; fixedColor: string }) => unknown;
  };
};

/** Fixed color for the selected metric. */
export function applyMetricSeriesColorOverrides(overrides: ColorOverrides, metric: MetricFunction) {
  overrides.matchFieldsWithNameByRegex('.*').overrideColor({
    mode: 'fixed',
    fixedColor: getMetricColorName(metric),
  });
}
