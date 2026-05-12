import { sceneGraph, SceneObject, SceneObjectState, VizPanel } from '@grafana/scenes';
import { cloneDeep, merge } from 'lodash';
import { EventTimeseriesDataReceived } from '../../../utils/shared';

export function syncYAxis() {
  return (vizPanel: SceneObject<SceneObjectState>) => {
    const eventSub = vizPanel.subscribeToEvent(EventTimeseriesDataReceived, (event) => {
      const series = event.payload.series;

      // Start at -Infinity so the first finite sample becomes the running max; if nothing
      // numeric is found, globalMax stays non-finite and we skip updateTimeseriesAxis below.
      let globalMax = Number.NEGATIVE_INFINITY;
      series?.forEach((s) => {
        s.fields.slice(1).forEach((f) => {
          globalMax = Math.max(globalMax, maxFiniteInFieldValues(f.values));
        });
      });

      if (!Number.isFinite(globalMax)) {
        return;
      }

      updateTimeseriesAxis(vizPanel, globalMax);
    });

    return () => {
      eventSub.unsubscribe();
    };
  };
}

function maxFiniteInFieldValues(values: ArrayLike<unknown>): number {
  let m = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v === 'number' && Number.isFinite(v)) {
      m = Math.max(m, v);
    }
  }
  return m;
}

function updateTimeseriesAxis(vizPanel: SceneObject, max: number) {
  // findAllObjects searches down the full scene graph
  const timeseries = sceneGraph.findAllObjects(vizPanel, (o) => o instanceof VizPanel) as VizPanel[];

  for (const t of timeseries) {
    t.clearFieldConfigCache(); // required

    t.setState({
      fieldConfig: merge(cloneDeep(t.state.fieldConfig), { defaults: { max } }),
    });
  }
}
