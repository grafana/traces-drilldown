import { AdHocVariableFilter, DataFrame, urlUtil } from '@grafana/data';
import {
  AdHocFiltersVariable,
  CustomVariable,
  DataSourceVariable,
  SceneDataQuery,
  SceneDataState,
  sceneGraph,
  SceneObject,
  SceneObjectUrlValues,
  SceneTimeRange,
  sceneUtils,
} from '@grafana/scenes';

import { TraceExploration } from '../pages/Explore';
import {
  EXPLORATIONS_ROUTE,
  VAR_DATASOURCE,
  VAR_DATASOURCE_EXPR,
  VAR_FILTERS,
  VAR_GROUPBY,
  VAR_HOME_FILTER,
  VAR_LATENCY_PARTIAL_THRESHOLD,
  VAR_LATENCY_THRESHOLD,
  VAR_METRIC,
  VAR_PRIMARY_SIGNAL,
  VAR_SPAN_LIST_COLUMNS,
} from './shared';
import { TracesByServiceScene } from 'components/Explore/TracesByService/TracesByServiceScene';
import { ActionViewType } from '../components/Explore/TracesByService/Tabs/TabsBarScene';
import { LocationService } from '@grafana/runtime';
import { Home } from 'pages/Home/Home';
import { PrimarySignalVariable } from 'pages/Explore/PrimarySignalVariable';

export function getTraceExplorationScene(model: SceneObject): TraceExploration {
  return sceneGraph.getAncestor(model, TraceExploration);
}

export function getHomeScene(model: SceneObject): Home {
  return sceneGraph.getAncestor(model, Home);
}

export function getTraceByServiceScene(model: SceneObject): TracesByServiceScene {
  return sceneGraph.getAncestor(model, TracesByServiceScene);
}

export function newTracesExploration(
  locationService: LocationService,
  initialDS?: string,
  initialFilters?: AdHocVariableFilter[]
): TraceExploration {
  return new TraceExploration({
    initialDS,
    initialFilters: initialFilters ?? [],
    $timeRange: new SceneTimeRange({ from: 'now-30m', to: 'now' }),
    locationService,
  });
}

export function newHome(initialFilters: AdHocVariableFilter[], initialDS?: string): Home {
  return new Home({
    initialDS,
    initialFilters,
    $timeRange: new SceneTimeRange({ from: 'now-30m', to: 'now' }),
  });
}

export function getErrorMessage(data: SceneDataState) {
  return data?.data?.error?.message ?? 'There are no Tempo data sources';
}

export function getNoDataMessage(context: string) {
  return `No data for selected data source and filter. Select another to see ${context}.`;
}

export function getUrlForExploration(exploration: TraceExploration) {
  const params = sceneUtils.getUrlState(exploration);
  return getUrlForValues(params);
}

export function getUrlForValues(values: SceneObjectUrlValues) {
  return urlUtil.renderUrl(EXPLORATIONS_ROUTE, values);
}

export function getDataSource(exploration: TraceExploration) {
  return sceneGraph.interpolate(exploration, VAR_DATASOURCE_EXPR);
}

export const getFilterSignature = (filter: AdHocVariableFilter) => {
  return `${filter.key}${filter.operator}${filter.value}`;
};

export function getAttributesAsOptions(attributes: string[]) {
  return attributes.map((attribute) => ({ label: attribute, value: attribute }));
}

export function getLabelKey(frame: DataFrame) {
  const labels = frame.fields.find((f) => f.type === 'number')?.labels;

  if (!labels) {
    return 'No labels';
  }

  const keys = Object.keys(labels);
  if (keys.length === 0) {
    return 'No labels';
  }

  return keys[0].replace(/"/g, '');
}

export function getLabelValue(frame: DataFrame, labelName?: string) {
  const labels = frame.fields.find((f) => f.type === 'number')?.labels;

  if (!labels) {
    return 'No labels';
  }

  const keys = Object.keys(labels).filter((k) => k !== 'p'); // remove the percentile label
  if (keys.length === 0) {
    return 'No labels';
  }

  return labels[labelName || keys[0]].replace(/"/g, '');
}

export function getGroupByVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_GROUPBY, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('Group by variable not found');
  }
  return variable;
}

export function getSpanListColumnsVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_SPAN_LIST_COLUMNS, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('Span list columns variable not found');
  }
  return variable;
}

export function getLatencyThresholdVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_LATENCY_THRESHOLD, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('Latency threshold variable not found');
  }
  return variable;
}

export function getLatencyPartialThresholdVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_LATENCY_PARTIAL_THRESHOLD, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('Partial latency threshold variable not found');
  }
  return variable;
}

export function getMetricVariable(scene: SceneObject): CustomVariable {
  const variable = sceneGraph.lookupVariable(VAR_METRIC, scene);
  if (!(variable instanceof CustomVariable)) {
    throw new Error('Metric variable not found');
  }
  return variable;
}

export function getFiltersVariable(scene: SceneObject): AdHocFiltersVariable {
  const variable = sceneGraph.lookupVariable(VAR_FILTERS, scene);
  if (!(variable instanceof AdHocFiltersVariable)) {
    throw new Error('Filters variable not found');
  }
  return variable;
}

export function getPrimarySignalVariable(scene: SceneObject): PrimarySignalVariable {
  const variable = sceneGraph.lookupVariable(VAR_PRIMARY_SIGNAL, scene);
  if (!(variable instanceof PrimarySignalVariable)) {
    throw new Error('Primary signal variable not found');
  }
  return variable;
}

export function getHomeFilterVariable(scene: SceneObject): AdHocFiltersVariable {
  const variable = sceneGraph.lookupVariable(VAR_HOME_FILTER, scene);
  if (!(variable instanceof AdHocFiltersVariable)) {
    throw new Error('Home filter variable not found');
  }
  return variable;
}

export function getDatasourceVariable(scene: SceneObject): DataSourceVariable {
  const variable = sceneGraph.lookupVariable(VAR_DATASOURCE, scene);
  if (!(variable instanceof DataSourceVariable)) {
    throw new Error('Datasource variable not found');
  }
  return variable;
}

export function getCurrentStep(scene: SceneObject): number | undefined {
  const data = sceneGraph.getData(scene).state.data;
  const targetQuery = data?.request?.targets[0];
  return targetQuery ? (targetQuery as SceneDataQuery).step : undefined;
}

export function shouldShowSelection(tab?: ActionViewType): boolean {
  return tab === 'comparison' || tab === 'traceList';
}

export function getMetricValue(scene: SceneObject) {
  return getMetricVariable(scene).useState().value;
}

export function fieldHasEmptyValues(data: SceneDataState) {
  return data?.data?.series[0].fields?.some((v) => v.values.every((e) => e === undefined)) ?? false;
}

export const isNumber = /^-?\d+\.?\d*$/;

export const formatLabelValue = (value: string) => {
  if (!isNumber.test(value) && typeof value === 'string' && !value.startsWith('"') && !value.endsWith('"')) {
    return `"${value}"`;
  }
  return value;
};

export const capitalizeFirstChar = (str: string) => str?.[0]?.toUpperCase() + str?.slice(1) || "";
