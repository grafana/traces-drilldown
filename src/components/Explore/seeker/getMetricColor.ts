import { GrafanaTheme2 } from '@grafana/data';
import { MetricFunction } from 'utils/shared';

export function getMetricColor(theme: GrafanaTheme2, metric?: MetricFunction): string {
  if (metric === 'duration') {
    return theme.visualization.getColorByName('blue');
  } else if (metric === 'errors') {
    return theme.visualization.getColorByName('semi-dark-red');
  }
  return theme.visualization.getColorByName('green');
}
