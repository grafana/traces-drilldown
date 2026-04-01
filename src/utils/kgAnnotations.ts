import { config } from '@grafana/runtime';
import {
  AdHocFiltersVariable,
  DataSourceVariable,
  dataLayers,
  SceneDataLayerSet,
  SceneObjectBase,
  SceneObjectRef,
  SceneObjectState,
  sceneGraph,
} from '@grafana/scenes';
import { DataQuery } from '@grafana/schema';
import { KgAnnotationToggle } from './KgAnnotationToggle';
import { VAR_DATASOURCE, VAR_FILTERS } from './shared';

const KG_DATASOURCE_TYPE = 'grafana-knowledgegraph-datasource';
const KG_DATASOURCE_UID = 'grafanacloud-knowledgegraph';

interface KgSceneProps {
  $data: SceneDataLayerSet;
  behaviors: KgAnnotationBehavior[];
  controls: KgAnnotationToggle;
}

function isKgAnnotationsAvailable(): boolean {
  if (!(config.featureToggles as Record<string, boolean | undefined>)['kgAnnotationsInExploreTraces']) {
    return false;
  }
  return Object.values(config.datasources).some((d) => d.uid === KG_DATASOURCE_UID);
}

const SEVERITIES = [
  { value: 'critical', color: 'red', label: 'Critical' },
  { value: 'warning', color: 'yellow', label: 'Warning' },
  { value: 'info', color: 'blue', label: 'Info' },
] as const;

function createAdvancedAnnotationLayers(entityType: string, entityName: string) {
  return SEVERITIES.map(
    (s) =>
      new dataLayers.AnnotationsDataLayer({
        name: `Insights - ${s.label}`,
        isEnabled: true,
        isHidden: true,
        query: {
          datasource: { type: KG_DATASOURCE_TYPE, uid: KG_DATASOURCE_UID },
          enable: true,
          iconColor: s.color,
          name: `KG Assertions - ${s.label}`,
          target: {
            refId: `kgAnnotations-${s.value}`,
            queryType: 'annotations',
            queryMode: 'advanced',
            severityFilter: [s.value],
            advancedQuery: {
              filterCriteria: [
                {
                  entityType,
                  propertyMatchers: [{ id: -1, name: 'name', op: '=', value: entityName, type: 'String' }],
                },
              ],
            },
          } as unknown as DataQuery,
        },
      })
  );
}

function createFromLabelsAnnotationLayers(labels: Record<string, string>, datasourceUid: string) {
  return SEVERITIES.map(
    (s) =>
      new dataLayers.AnnotationsDataLayer({
        name: `Insights - ${s.label}`,
        isEnabled: true,
        isHidden: true,
        query: {
          datasource: { type: KG_DATASOURCE_TYPE, uid: KG_DATASOURCE_UID },
          enable: true,
          iconColor: s.color,
          name: `KG Assertions - ${s.label}`,
          target: {
            refId: `kgAnnotations-${s.value}`,
            queryType: 'annotations',
            queryMode: 'fromLabels',
            severityFilter: [s.value],
            fromLabelsQuery: {
              telemetryType: 'trace',
              datasourceUid,
              labels,
            },
          } as unknown as DataQuery,
        },
      })
  );
}

interface KgAnnotationBehaviorState extends SceneObjectState {
  layerSet: SceneObjectRef<SceneDataLayerSet>;
  toggle: SceneObjectRef<KgAnnotationToggle>;
}

class KgAnnotationBehavior extends SceneObjectBase<KgAnnotationBehaviorState> {
  private currentLookupKey: string | undefined;

  constructor(state: KgAnnotationBehaviorState) {
    super(state);
    this.addActivationHandler(this._onActivate);
  }

  private _onActivate = () => {
    const filtersVar = sceneGraph.lookupVariable(VAR_FILTERS, this) as AdHocFiltersVariable | undefined;
    if (!filtersVar) {
      return;
    }

    const dsVar = sceneGraph.lookupVariable(VAR_DATASOURCE, this) as DataSourceVariable | undefined;

    this.onFiltersChanged(filtersVar, dsVar);

    const subs = [
      filtersVar.subscribeToState(() => {
        this.onFiltersChanged(filtersVar, dsVar);
      }),
    ];

    if (dsVar) {
      subs.push(
        dsVar.subscribeToState(() => {
          this.onFiltersChanged(filtersVar, dsVar);
        })
      );
    }

    return () => {
      subs.forEach((s) => s.unsubscribe());
    };
  };

  private onFiltersChanged(filtersVar: AdHocFiltersVariable, dsVar?: DataSourceVariable) {
    const equalFilters = filtersVar.state.filters.filter((f) => f.operator === '=');

    const serviceNameFilter = equalFilters.find((f) => f.key === 'resource.service.name');
    const serviceName = serviceNameFilter?.value?.replace(/"/g, '');

    const datasourceUid = (dsVar?.getValue() as string) || '';
    const lookupKey = `${datasourceUid}::${serviceName ?? ''}::${JSON.stringify(equalFilters.map((f) => `${f.key}=${f.value}`))}`;

    if (lookupKey === this.currentLookupKey) {
      return;
    }
    this.currentLookupKey = lookupKey;

    const layerSet = this.state.layerSet.resolve();
    const toggle = this.state.toggle.resolve();

    let layers: ReturnType<typeof createAdvancedAnnotationLayers>;

    if (serviceName) {
      // When we have a known entity name, use the deterministic advanced query
      layers = createAdvancedAnnotationLayers('Service', serviceName);
    } else if (equalFilters.length > 0 && datasourceUid) {
      // Otherwise, fall back to fromLabels and let KG resolve entities
      const labels: Record<string, string> = {};
      for (const f of equalFilters) {
        labels[f.key] = f.value;
      }
      layers = createFromLabelsAnnotationLayers(labels, datasourceUid);
    } else {
      layerSet.setState({ layers: [] });
      return;
    }

    layerSet.setState({ layers });
    toggle.syncLayerEnabledState();
  }
}

export function getKgSceneProps(): KgSceneProps | undefined {
  if (!isKgAnnotationsAvailable()) {
    return undefined;
  }

  const layerSet = new SceneDataLayerSet({ name: 'Insights', layers: [] });

  const toggle = new KgAnnotationToggle({
    isEnabled: true,
    layerSetRef: new SceneObjectRef(layerSet),
  });

  const behavior = new KgAnnotationBehavior({
    layerSet: new SceneObjectRef(layerSet),
    toggle: new SceneObjectRef(toggle),
  });

  return {
    $data: layerSet,
    behaviors: [behavior],
    controls: toggle,
  };
}
