import React, { useMemo, useState } from 'react';

import { usePluginComponent } from '@grafana/runtime';
import { SceneObject } from '@grafana/scenes';
import { DataQuery } from '@grafana/schema';
import { ToolbarButton } from '@grafana/ui';

import { getDatasourceVariable, getFiltersVariable, getTraceExplorationScene } from '../../../utils/utils';
import { SaveSearchModal } from './SaveSearchModal';
import { renderTraceQLLabelFilters } from '../../../utils/filters-renderer';
import { isQueryLibrarySupported, OpenQueryLibraryComponentProps } from './saveSearch';

interface Props {
  sceneRef: SceneObject;
}

export function SaveSearchButton({ sceneRef }: Props) {
  const [saving, setSaving] = useState(false);
  const { component: OpenQueryLibraryComponent, isLoading: isLoadingExposedComponent } =
    usePluginComponent<OpenQueryLibraryComponentProps>('grafana/query-library-context/v1');

  const dsUid = useMemo(() => {
    const ds = getDatasourceVariable(sceneRef);
    return ds.getValue().toString();
  }, [sceneRef]);

  const dsName = useMemo(() => {
    const ds = getDatasourceVariable(sceneRef);
    return ds.state.text.toString();
  }, [sceneRef]);

  const traceExploration = useMemo(() => getTraceExplorationScene(sceneRef), [sceneRef]);

  const { filters } = getFiltersVariable(traceExploration).useState();
  const hasFilters = filters.length > 0;

  const fallbackComponent = useMemo(
    () => (
      <>
        <ToolbarButton
          variant="canvas"
          icon="save"
          onClick={() => setSaving(true)}
          tooltip="Save search"
        />
        {saving && <SaveSearchModal dsUid={dsUid} sceneRef={sceneRef} onClose={() => setSaving(false)} />}
      </>
    ),
    [dsUid, saving, sceneRef]
  );

  const query: DataQuery = useMemo(() => {
    const queryExpr = renderTraceQLLabelFilters(filters);
    return {
      refId: 'traces-drilldown',
      datasource: {
        type: 'tempo',
        uid: dsUid,
      },
      query: queryExpr,
      queryType: 'traceql',
    };
  }, [filters, dsUid]);

  if (traceExploration.state.embedded) {
    return null;
  }

  if (!hasFilters) {
    return null;
  }

  if (!isQueryLibrarySupported()) {
    return fallbackComponent;
  } else if (isLoadingExposedComponent || !OpenQueryLibraryComponent) {
    return null;
  }

  return (
    <OpenQueryLibraryComponent
      datasourceFilters={[dsName]}
      query={query}
      tooltip="Save in Saved Queries"
    />
  );
}
