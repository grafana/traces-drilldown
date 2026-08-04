import { GrafanaTheme2 } from '@grafana/data';
import { MetricFunction } from 'utils/shared';

/**
 * Grafana visualization palette name for a metric series.
 * Rate is neutral throughput (all spans), so use blue — green is reserved for an
 * explicit success signal. Duration stays in the neutral family as semi-dark-blue
 * so it remains distinguishable from rate.
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
