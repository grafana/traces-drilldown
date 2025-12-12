import { css } from '@emotion/css';
import { SceneObjectBase, SceneComponentProps, SceneObject, sceneGraph, SceneObjectState } from '@grafana/scenes';
import { GrafanaTheme2, LoadingState } from '@grafana/data';
import { useStyles2, Box, Stack, TabsBar, Tab } from '@grafana/ui';
import React, { useEffect, useState } from 'react';
import {
  getTraceExplorationScene,
  getTraceByServiceScene,
  getExceptionsScene,
  getFiltersVariable,
  getPrimarySignalVariable,
} from 'utils/utils';
import { ShareExplorationAction } from '../../actions/ShareExplorationAction';
import { buildSpansScene } from './Spans/SpansScene';
import { buildStructureScene } from './Structure/StructureScene';
import { buildBreakdownScene } from './Breakdown/BreakdownScene';
import { buildExceptionsScene } from './Exceptions/ExceptionsScene';
import { MetricFunction } from 'utils/shared';
import { buildComparisonScene } from './Comparison/ComparisonScene';
import { buildAdaptiveTracesScene } from './AdaptiveTraces/AdaptiveTracesScene';
import { useMount } from 'react-use';
import { ActionViewType } from 'exposedComponents/types';

interface ActionViewDefinition {
  displayName: (metric: MetricFunction) => string;
  value: ActionViewType;
  getScene: (metric: MetricFunction) => SceneObject;
}

export const actionViewsDefinitions: ActionViewDefinition[] = [
  { displayName: breakdownDisplayName, value: 'breakdown', getScene: buildBreakdownScene },
  { displayName: structureDisplayName, value: 'structure', getScene: buildStructureScene },
  { displayName: comparisonDisplayName, value: 'comparison', getScene: buildComparisonScene },
  { displayName: exceptionsDisplayName, value: 'exceptions', getScene: buildExceptionsScene },
  {
    displayName: tracesDisplayName,
    value: 'traceList',
    getScene: buildSpansScene,
  },
  {
    displayName: adaptiveTracesDisplayName,
    value: 'adaptiveTraces',
    getScene: buildAdaptiveTracesScene,
  },
];

export interface TabsBarSceneState extends SceneObjectState {}

export class TabsBarScene extends SceneObjectBase<TabsBarSceneState> {
  public static Component = ({ model }: SceneComponentProps<TabsBarScene>) => {
    const styles = useStyles2(getStyles);
    const [exceptionsCount, setExceptionsCount] = useState(0);

    const metricScene = getTraceByServiceScene(model);
    const exploration = getTraceExplorationScene(model);

    const { actionView } = metricScene.useState();
    const { value: metric } = exploration.getMetricVariable().useState();
    const { allowedActionViews } = exploration.useState();
    const dataState = sceneGraph.getData(model).useState();
    const tracesCount = dataState.data?.series?.[0]?.length;

    const enabledViews = actionViewsDefinitions.filter((view) => {
      if (view.value === 'exceptions' && metric !== 'errors') {
        return false;
      }
      // If allowedActionViews is defined and has items, use it for filtering
      // Otherwise, include all views (except exceptions when metric is not errors, handled above)
      return !allowedActionViews?.length || allowedActionViews.includes(view.value);
    });

    // Get state variables that affect exceptions data
    const filtersVariable = getFiltersVariable(model);
    const primarySignalVariable = getPrimarySignalVariable(model);
    const timeRange = sceneGraph.getTimeRange(model);
    const { filters } = filtersVariable.useState();
    const { value: primarySignal } = primarySignalVariable.useState();
    const { value: timeRangeValue } = timeRange.useState();

    useEffect(() => {
      if (metric !== 'errors') {
        setExceptionsCount(0);
        return;
      }

      const exceptionsScene = getExceptionsScene(model);
      if (!exceptionsScene) {
        setExceptionsCount(0);
        return;
      }

      setExceptionsCount(exceptionsScene.getExceptionsCount());
      const subscription = exceptionsScene.subscribeToState((newState, prevState) => {
        if (newState.exceptionsCount !== prevState.exceptionsCount) {
          setExceptionsCount(newState.exceptionsCount || 0);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }, [metric, model, actionView, filters, primarySignal, timeRangeValue]);

    useEffect(() => {
      if (metricScene.state.hasSetView) {
        return;
      }

      // Set the view to traceList if the data is loaded and the traces count is greater than 20
      if (
        exploration.state.embedded &&
        dataState.data?.state === LoadingState.Done &&
        tracesCount !== undefined &&
        tracesCount > 20
      ) {
        metricScene.setState({ hasSetView: true });
        metricScene.setActionView('traceList');
        return;
      }
    }, [dataState.data?.state, exploration.state.embedded, metricScene, tracesCount]);

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
                counter={
                  tab.value === 'traceList' ? tracesCount : tab.value === 'exceptions' ? exceptionsCount : undefined
                }
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

function exceptionsDisplayName(_: MetricFunction) {
  return 'Exceptions';
}

function adaptiveTracesDisplayName() {
  return 'Adaptive Traces';
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
