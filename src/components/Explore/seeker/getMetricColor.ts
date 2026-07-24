import { GrafanaTheme2 } from '@grafana/data';
import { MetricFunction } from 'utils/shared';

export function getMetricColor(theme: GrafanaTheme2, metric?: MetricFunction): string {
  if (metric === 'duration') {
    // Semi-dark-blue keeps duration in the neutral family but visually distinct from rate (blue).
    return theme.visualization.getColorByName('semi-dark-blue');
  } else if (metric === 'errors') {
    return theme.visualization.getColorByName('semi-dark-red');
  }
  // Rate is neutral throughput (all spans, regardless of status), so use a neutral
  // color. Green is reserved for an explicit success signal.
  return theme.visualization.getColorByName('blue');
}
