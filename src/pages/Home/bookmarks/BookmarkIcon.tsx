import { ToolbarButton, Icon } from "@grafana/ui";
import { TracesByServiceScene } from "components/Explore/TracesByService/TracesByServiceScene";
import React, { useEffect } from "react";
import { getGroupByVariable, getDatasourceVariable, getFiltersVariable, getTraceExplorationScene, getSpanListColumnsVariable } from "utils/utils";
import { bookmarkExists, getBookmarkFromURL, toggleBookmark } from "./utils";
import { TraceExplorationScene } from "pages/Explore/TraceExploration";
import { sceneGraph } from "@grafana/scenes";

type Props = {
  model: TraceExplorationScene;
}

export const BookmarkIcon = React.memo(({ model }: Props) => {
  const traceExploration = getTraceExplorationScene(model);
  const { topScene, primarySignal } = traceExploration.useState();
  
  const { value: datasource } = getDatasourceVariable(model).useState();
  const { value: metric } = traceExploration.getMetricVariable().useState();
  const { value: groupBy } = getGroupByVariable(model).useState();
  const { value: spanListColumns } = getSpanListColumnsVariable(model).useState();
  const { filters } = getFiltersVariable(model).useState();
  const timeRange = sceneGraph.getTimeRange(model).useState().value;

  const [actionView, setActionView] = React.useState<string | undefined>(
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

  const [isBookmarked, setIsBookmarked] = React.useState(bookmarkExists(getBookmarkFromURL()));

  useEffect(() => {
    setIsBookmarked(bookmarkExists(getBookmarkFromURL()));
  }, [datasource, metric, primarySignal, filters, actionView, groupBy, timeRange.from, timeRange.to, spanListColumns]);

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
      onClick={() => {
        toggleBookmark();
        setIsBookmarked(bookmarkExists(getBookmarkFromURL()));
      }}
    />
  )
});
