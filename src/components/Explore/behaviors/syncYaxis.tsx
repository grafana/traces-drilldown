import { sceneGraph, SceneObject, SceneObjectState, VizPanel } from '@grafana/scenes';
import { cloneDeep, merge } from 'lodash';
import { EventTimeseriesDataReceived } from '../../../utils/shared';

export function syncYAxis() {
  return (vizPanel: SceneObject<SceneObjectState>) => {
    const eventSub = vizPanel.subscribeToEvent(EventTimeseriesDataReceived, (event) => {
      const series = event.payload.series;

      let globalMax: number | null = null;
      series?.forEach((s) => {
        // Skip field 0 (typically time); only numeric value fields contribute to the Y max.
        s.fields.slice(1).forEach((f) => {
          const fieldMax = maxFiniteInFieldValues(f.values);
          if (fieldMax !== null) {
            globalMax = globalMax === null ? fieldMax : Math.max(globalMax, fieldMax);
          }
        });
      });

      if (globalMax === null) {
        return;
      }

      updateTimeseriesAxis(vizPanel, globalMax);
    });

    return () => {
      eventSub.unsubscribe();
    };
  };
}

function maxFiniteInFieldValues(values: ArrayLike<unknown>): number | null {
  let max: number | null = null;
  const len = values.length;
  for (let i = 0; i < len; i++) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      max = max === null ? value : Math.max(max, value);
    }
  }
  return max;
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
