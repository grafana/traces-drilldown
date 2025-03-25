import { ToolbarButton, Icon } from '@grafana/ui';
import { TracesByServiceScene } from 'components/Explore/TracesByService/TracesByServiceScene';
import React, { useEffect, useState } from 'react';
import {
  getGroupByVariable,
  getDatasourceVariable,
  getFiltersVariable,
  getTraceExplorationScene,
  getSpanListColumnsVariable,
  getMetricVariable,
  getPrimarySignalVariable,
} from 'utils/utils';
import { getBookmarkFromURL, useBookmarksStorage } from './utils';
import { TraceExplorationScene } from 'pages/Explore/TraceExploration';
import { SceneComponentProps, sceneGraph } from '@grafana/scenes';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';

export const BookmarkIcon = ({ model }: SceneComponentProps<TraceExplorationScene>) => {
  const traceExploration = getTraceExplorationScene(model);
  const { topScene } = traceExploration.useState();
  const { bookmarkExists, toggleBookmark } = useBookmarksStorage();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { value: datasource } = getDatasourceVariable(model).useState();
  const { value: metric } = getMetricVariable(model).useState();
  const { value: groupBy } = getGroupByVariable(model).useState();
  const { value: spanListColumns } = getSpanListColumnsVariable(model).useState();
  const { value: primarySignal } = getPrimarySignalVariable(model).useState();
  const { filters } = getFiltersVariable(model).useState();
  const timeRange = sceneGraph.getTimeRange(model).useState().value;

  const [actionView, setActionView] = useState<string | undefined>(
    topScene instanceof TracesByServiceScene ? topScene.state.actionView : undefined
  );

  useEffect(() => {
    if (topScene instanceof TracesByServiceScene) {
      const subscription = topScene.subscribeToState((newState, oldState) => {
        if (newState.actionView !== oldState.actionView) {
          setActionView(newState.actionView);
        }
      });
      return () => subscription.unsubscribe();
    }
    return () => {};
  }, [topScene]);

  const checkIfBookmarked = async () => {
    setIsLoading(true);
    try {
      const bookmark = getBookmarkFromURL();
      const exists = await bookmarkExists(bookmark);
      setIsBookmarked(exists);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      setIsBookmarked(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkIfBookmarked();
  }, []);

  useEffect(() => {
    checkIfBookmarked();
  }, [
    datasource,
    metric,
    primarySignal,
    filters,
    actionView,
    groupBy,
    timeRange.from,
    timeRange.to,
    spanListColumns,
  ]);

  const toggleBookmarkClicked = async () => {
    try {
      setIsLoading(true);
      const isNowBookmarked = await toggleBookmark();
      setIsBookmarked(isNowBookmarked);
      reportAppInteraction(
        USER_EVENTS_PAGES.analyse_traces,
        USER_EVENTS_ACTIONS.analyse_traces.toggle_bookmark_clicked,
        {
          isBookmarked: isNowBookmarked,
        }
      );
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
      onClick={toggleBookmarkClicked}
      disabled={isLoading}
    />
  );
};
