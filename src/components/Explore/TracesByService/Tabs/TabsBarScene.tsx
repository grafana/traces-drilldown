import { css } from '@emotion/css';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, SceneObject, sceneGraph } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, Box, Stack, TabsBar, Tab } from '@grafana/ui';
import React from 'react';
import { getTraceExplorationScene, getTraceByServiceScene } from 'utils/utils';
import { ShareExplorationAction } from '../../actions/ShareExplorationAction';
import { buildSpansScene } from './Spans/SpansScene';
import { buildStructureScene } from './Structure/StructureScene';
import { buildBreakdownScene } from './Breakdown/BreakdownScene';
import { MetricFunction } from 'utils/shared';
import { buildComparisonScene } from './Comparison/ComparisonScene';
import { useMount } from 'react-use';

interface ActionViewDefinition {
  displayName: (metric: MetricFunction) => string;
  value: ActionViewType;
  getScene: (metric: MetricFunction) => SceneObject;
}

export type ActionViewType = 'traceList' | 'breakdown' | 'structure' | 'comparison';
export const actionViewsDefinitions: ActionViewDefinition[] = [
  { displayName: breakdownDisplayName, value: 'breakdown', getScene: buildBreakdownScene },
  { displayName: structureDisplayName, value: 'structure', getScene: buildStructureScene },
  { displayName: comparisonDisplayName, value: 'comparison', getScene: buildComparisonScene },
  {
    displayName: tracesDisplayName,
    value: 'traceList',
    getScene: buildSpansScene,
  },
];

export interface TabsBarSceneState extends SceneObjectState {}

export class TabsBarScene extends SceneObjectBase<TabsBarSceneState> {
  public static Component = ({ model }: SceneComponentProps<TabsBarScene>) => {
    const styles = useStyles2(getStyles);

    const metricScene = getTraceByServiceScene(model);
    const exploration = getTraceExplorationScene(model);

    const { actionView } = metricScene.useState();
    const { value: metric } = exploration.getMetricVariable().useState();
    const { allowedActionViews } = exploration.useState();
    const dataState = sceneGraph.getData(model).useState();
    const tracesCount = dataState.data?.series?.[0]?.length;

    const enabledViews =
      actionViewsDefinitions.filter((view) => allowedActionViews?.includes(view.value)) ?? actionViewsDefinitions;

    useMount(() => {
      if (enabledViews.length === 1) {
        metricScene.setActionView(enabledViews[0].value);
      }
    });

    if (enabledViews.length === 1) {
      return null;
    }

    return (
      <Box>
        <div className={styles.actions}>
          <Stack gap={1}>
            <ShareExplorationAction exploration={exploration} />
          </Stack>
        </div>

        <TabsBar>
          {enabledViews.map((tab, index) => {
            return (
              <Tab
                key={index}
                label={tab.displayName(metric as MetricFunction)}
                active={actionView === tab.value}
                onChangeTab={() => metricScene.setActionView(tab.value)}
                counter={tab.value === 'traceList' ? tracesCount : undefined}
              />
            );
          })}
        </TabsBar>
      </Box>
    );
  };
}

function breakdownDisplayName(_: MetricFunction) {
  return 'Breakdown';
}

function comparisonDisplayName(_: MetricFunction) {
  return 'Comparison';
}

export function structureDisplayName(metric: MetricFunction) {
  switch (metric) {
    case 'rate':
      return 'Service structure';
    case 'errors':
      return 'Root cause errors';
    case 'duration':
      return 'Root cause latency';
  }
}

function tracesDisplayName(metric: MetricFunction) {
  return metric === 'errors' ? 'Errored traces' : metric === 'duration' ? 'Slow traces' : 'Traces';
}

function getStyles(theme: GrafanaTheme2) {
  return {
    actions: css({
      [theme.breakpoints.up(theme.breakpoints.values.md)]: {
        position: 'absolute',
        right: 0,
        top: 5,
        zIndex: 2,
      },
    }),
  };
}
