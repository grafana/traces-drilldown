import { DataFrame, rangeUtil, TimeRange } from "@grafana/data";
import { usePluginFunctions } from "@grafana/runtime";
import { sceneGraph, SceneObject, SceneObjectState } from "@grafana/scenes";
import { useCallback } from "react";
import { MetricFunction } from "utils/shared";
import { getFiltersVariable, getMetricVariable } from "utils/utils";


const extensionPointId = 'grafana-exploretraces-app/get-annotations/v1'
export type AnnotationTypes = 'error rates' | 'duration'
type Filter = {key: string, operator: string, value: string}
type GetAnnotationsFn = (types: AnnotationTypes[], timeRange: TimeRange, filters?: Filter[]) => Promise<DataFrame[]>


export interface AnnotationExtensionsState extends SceneObjectState{
  annotationExtensions?: DataFrame[],
  getAnnotationExtensions?: GetAnnotationExentionsFunction;
  hasAnnotationExtensionBehavior?: boolean,
  multiLaneAnnotations?: boolean,
}

/**
 * This will require that the `useAnnotationExtensions` is called for the same instance of
 * SceneObject<AnnotationExtensionsState>, in its static Component method.
 */
export function enrichWithAnnotations() {

  function enrichPanel(scene: SceneObject<AnnotationExtensionsState>) {
    // Step one: register scene with `enrichPanel` and set `hasAnnotationExtensionBehavior`
    scene.setState({hasAnnotationExtensionBehavior: true})

    scene.subscribeToState((newState, prevState) => {
      if (newState.getAnnotationExtensions !== prevState.getAnnotationExtensions) {
        // We have a new `getAnnotationExtensions` and it is not null
        refetchAnnotationExtensions();
      }
    })


    function refetchAnnotationExtensions() {
      const {getAnnotationExtensions} = scene.state;

      const metric = getMetricVariable(scene).state.value as MetricFunction
      const annotationExtensionTypeFilter: AnnotationTypes[] = [];

      switch (metric) {
        case 'duration': {
          annotationExtensionTypeFilter.push('duration');
          break
        }
        case "errors": {
          annotationExtensionTypeFilter.push('error rates');
          break;
        }
      }

      const filters = getFiltersVariable(scene).state.filters || [].map(
        ({key, operator, value}) => ({key, operator, value})
      );

      if (!getAnnotationExtensions) {
        console.log("getAnnotationExtensions is null", getAnnotationExtensions)
        return;
      }
      const {from, to} = sceneGraph.getTimeRange(scene).state;
      getAnnotationExtensions(annotationExtensionTypeFilter, from, to, filters).then(
        // It will be up to the scene implementation to figure out how it will handle changes to `annotationExtensions`
        (annotationExtensions) => scene.setState({annotationExtensions})
      )
    }
  };
  return enrichPanel;
}

/** 
 * This hook will set up a scene with `AnnotationExtensionsState` with a function to 
 * obtain annotations from plugin extensions, if it has been initialized with the behavior
 * from `enrichWithAnnotations`
 */
export function useAnnotationExtensions(scene: SceneObject<AnnotationExtensionsState>) {
  const {functions, isLoading} = usePluginFunctions<GetAnnotationsFn>({extensionPointId});

  const { getAnnotationExtensions, hasAnnotationExtensionBehavior } = scene.useState()

  const getAnnotationExtensionsCallback = useCallback(
    async (types: AnnotationTypes[], from: string, to: string, filters: Filter[]) => {
      if (!functions) {
        // This callback should not even be avialable to be called if `functions` is not set
        throw new Error(extensionPointId + "is not ready.");
      }

      const results: DataFrame[] = []

      const timeRange = rangeUtil.convertRawToRange({from, to});

      for (const {fn} of functions) {
        const result = await fn(types, timeRange, filters)
        result.forEach(annotation => results.push(annotation));
      }

      return results;
    },
    [functions]
  )

  // Here are some reasons to not set the `getAnnotationExtensions` on scene state
  const alreadySet = getAnnotationExtensions === getAnnotationExtensionsCallback
  if (isLoading || !functions || !hasAnnotationExtensionBehavior || alreadySet) {
    return;
  }

  // Intialization Step Two
  scene.setState({getAnnotationExtensions: getAnnotationExtensionsCallback})
}

type GetAnnotationExentionsFunction = (types: AnnotationTypes[], from: string, to: string, filter: any) => Promise<DataFrame[]>



