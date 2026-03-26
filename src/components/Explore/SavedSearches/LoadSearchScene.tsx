import React, { useCallback, useMemo } from 'react';

import { css } from '@emotion/css';

import { AppEvents, GrafanaTheme2 } from '@grafana/data';
import { getAppEvents, reportInteraction, usePluginComponent } from '@grafana/runtime';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { ToolbarButton, useStyles2 } from '@grafana/ui';

import { LoadSearchModal } from './LoadSearchModal';
import { getDatasourceVariable, getTraceExplorationScene } from '../../../utils/utils';
import { DataQuery } from '@grafana/schema';
import { OpenQueryLibraryComponentProps, useHasSavedSearches, isQueryLibrarySupported, applySavedSearchToScene } from './saveSearch';

export interface LoadSearchSceneState extends SceneObjectState {
  dsName: string;
  dsUid: string;
  isOpen: boolean;
}
export class LoadSearchScene extends SceneObjectBase<LoadSearchSceneState> {
  constructor(state: Partial<LoadSearchSceneState> = {}) {
    super({
      dsUid: '',
      dsName: '',
      isOpen: false,
      ...state,
    });

    this.addActivationHandler(this.onActivate);
  }

  onActivate = () => {
    this.setState({
      dsUid: getDatasourceVariable(this).getValue().toString(),
      dsName: getDatasourceVariable(this).state.text.toString(),
    });

    this._subs.add(
      getDatasourceVariable(this).subscribeToState((newState) => {
        this.setState({
          dsUid: newState.value.toString(),
          dsName: getDatasourceVariable(this).state.text.toString(),
        });
      })
    );
  };

  toggleOpen = () => {
    this.setState({
      isOpen: true,
    });
  };

  toggleClosed = () => {
    this.setState({
      isOpen: false,
    });
  };

  static Component = ({ model }: SceneComponentProps<LoadSearchScene>) => {
    const { dsName, dsUid, isOpen } = model.useState();
    const styles = useStyles2(getStyles);
    const hasSavedSearches = useHasSavedSearches(dsUid);

    const { component: OpenQueryLibraryComponent, isLoading: isLoadingExposedComponent } =
      usePluginComponent<OpenQueryLibraryComponentProps>('grafana/query-library-context/v1');

    const traceExploration = useMemo(() => getTraceExplorationScene(model), [model]);

    const fallbackComponent = useMemo(
      () => (
        <>
          <ToolbarButton
            icon="folder-open"
            variant="canvas"
            disabled={!hasSavedSearches}
            onClick={model.toggleOpen}
            className={styles.button}
            tooltip={
              hasSavedSearches ? 'Load saved search' : 'No saved searches to load'
            }
          />
          {isOpen && <LoadSearchModal sceneRef={model} onClose={model.toggleClosed} />}
        </>
      ),
      [hasSavedSearches, isOpen, model, styles.button]
    );

    const onSelectQuery = useCallback(
      (query: DataQuery) => {
        const appEvents = getAppEvents();

        if (query.datasource?.type !== 'tempo') {
          appEvents.publish({
            payload: ['Please select a Tempo query.'],
            type: AppEvents.alertError.name,
          });
          return;
        }

        const tempoQuery = query as DataQuery & { query?: string };
        const queryStr = tempoQuery.query ?? '';
        const dsUid = query.datasource?.uid ?? '';
        applySavedSearchToScene(model, queryStr, dsUid);
        reportInteraction('grafana_traces_app_load_search_saved_query_loaded');
      },
      [model]
    );

    if (traceExploration.state.embedded) {
      return null;
    }

    if (!isQueryLibrarySupported()) {
      return fallbackComponent;
    } else if (isLoadingExposedComponent || !OpenQueryLibraryComponent) {
      return null;
    }

    return (
      <OpenQueryLibraryComponent
        className={styles.button}
        context="drilldown"
        datasourceFilters={[dsName]}
        icon="folder-open"
        onSelectQuery={onSelectQuery}
        tooltip="Load saved query"
      />
    );
  };
}

const getStyles = (theme: GrafanaTheme2) => ({
  button: css({
    [theme.breakpoints.down('lg')]: {
      alignSelf: 'flex-start',
    },
    alignSelf: 'flex-end',
  }),
});
