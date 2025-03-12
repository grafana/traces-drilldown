import { css } from '@emotion/css';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, SceneObject, sceneGraph } from '@grafana/scenes';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, Box, Stack, TabsBar, Tab, ToolbarButton, Icon } from '@grafana/ui';
import React, { useEffect } from 'react';
import { getTraceExplorationScene, getTraceByServiceScene, getGroupByVariable, getFiltersVariable, getDatasourceVariable } from 'utils/utils';
import { ShareExplorationAction } from '../../actions/ShareExplorationAction';
import { buildSpansScene } from './Spans/SpansScene';
import { buildStructureScene } from './Structure/StructureScene';
import { buildBreakdownScene } from './Breakdown/BreakdownScene';
import { MetricFunction } from 'utils/shared';
import { buildComparisonScene } from './Comparison/ComparisonScene';
import { bookmarkExists, getBookmarkFromURL, toggleBookmark } from 'pages/Home/bookmarks/utils';

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
    const metricScene = getTraceByServiceScene(model);
    const styles = useStyles2(getStyles);
    const exploration = getTraceExplorationScene(model);
    const { actionView } = metricScene.useState();
    const { primarySignal } = exploration.useState();
    const { value: metric } = exploration.getMetricVariable().useState();
    const { value: groupBy } = getGroupByVariable(model).useState();
    const { value: datasource } = getDatasourceVariable(model).useState();
    const { filters } = getFiltersVariable(model).useState();
    const dataState = sceneGraph.getData(model).useState();
    const tracesCount = dataState.data?.series?.[0]?.length;

    const [isBookmarked, setIsBookmarked] = React.useState(bookmarkExists(getBookmarkFromURL()));

    useEffect(() => {
      setIsBookmarked(bookmarkExists(getBookmarkFromURL()));
    }, [actionView, primarySignal, datasource, filters, groupBy, metric]);

    return (
      <Box>
        <div className={styles.actions}>
          <Stack gap={1}>
            <ShareExplorationAction exploration={exploration} />
            <ToolbarButton
              variant={'canvas'}
              icon={
                isBookmarked ? (
                  <Icon name={'favorite'} type={'mono'} size={'lg'} />
                ) : (
                  <Icon name={'star'} type={'default'} size={'lg'} />
                )
              }
              tooltip={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              onClick={() => {
                toggleBookmark();
                setIsBookmarked(bookmarkExists(getBookmarkFromURL()));
              }}
            />
          </Stack>
        </div>

        <TabsBar>
          {actionViewsDefinitions.map((tab, index) => {
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
