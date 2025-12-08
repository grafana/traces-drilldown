import { getTraceByServiceScene, shouldShowSelection } from '../../../utils/utils';
import { ComparisonSelection } from '../../../utils/shared';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { PanelBuilders, SceneFlexItem, SceneFlexLayout, SceneObject } from '@grafana/scenes';

export function getHistogramVizPanel(scene: SceneObject, yBuckets: number[], panelBuilderCallback?: (builder: ReturnType<typeof histogramPanelConfig>) => void) {
  const parent = getTraceByServiceScene(scene);
  const panelBuilder = histogramPanelConfig()
    .setHoverHeader(true)
    // @ts-ignore
    .setOption('selectionMode', 'xy');
  panelBuilderCallback?.(panelBuilder)
  const panel = panelBuilder.build();
  panel.setState({
    extendPanelContext: (vizPanel, context) => {
      // TODO remove when we the Grafana version with #88107 is released
      // @ts-ignore
      context.onSelectRange = (args) => {
        if (args.length === 0) {
          parent.setState({ selection: undefined });
          return;
        }
        const rawSelection = args[0];
        // @ts-ignore
        const newSelection: ComparisonSelection = { type: 'manual', raw: rawSelection };

        newSelection.timeRange = {
          from: Math.round((rawSelection.x?.from || 0) / 1000),
          to: Math.round((rawSelection.x?.to || 0) / 1000),
        };

        // Ignore selection and return if the selection is invalid
        if (newSelection.timeRange.from === newSelection.timeRange.to) {
          return;
        }

        const yFrom = yBucketToDuration((args[0].y?.from || 0) - 1, yBuckets);
        const yTo = yBucketToDuration(args[0].y?.to || 0, yBuckets);
        newSelection.duration = { from: yFrom, to: yTo };

        parent.onUserUpdateSelection(newSelection);
        if (!shouldShowSelection(parent.state.actionView)) {
          parent.setActionView('comparison');
        }

        reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.start_investigation, {
          selection: newSelection,
          metric: 'duration',
        });
      };
    },
  });
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        body: panel,
      }),
    ],
  });
}

export const histogramPanelConfig = () => {
  return PanelBuilders.heatmap()
    .setOption('legend', { show: false })
    .setOption('yAxis', {
      unit: 's',
      axisLabel: 'duration',
    })
    .setOption('color', {
      scheme: 'Blues',
      steps: 16,
    })
    .setOption('rowsFrame', { value: 'Spans' });
};

export function yBucketToDuration(yValue: number, buckets?: number[], multiplier?: number) {
  if (!buckets) {
    return '';
  }
  if (yValue < 0) {
    return '0';
  }

  const rawValue = buckets[Math.floor(yValue)] * (multiplier || 1);
  if (!rawValue || isNaN(rawValue)) {
    return '';
  }
  if (rawValue >= 1) {
    return `${rawValue.toFixed(0)}s`;
  }
  return `${(rawValue * 1000).toFixed(0)}ms`;
}
