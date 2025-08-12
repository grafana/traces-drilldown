import {
  PluginExtensionAddedLinkConfig,
  PluginExtensionPanelContext,
  PluginExtensionPoints,
  toURLRange,
} from '@grafana/data';

import { DataSourceRef } from '@grafana/schema';
import { EXPLORATIONS_ROUTE, VAR_DATASOURCE, VAR_FILTERS, VAR_METRIC } from './shared';
import { parseTraceQLQuery } from './limited-traceql-parser';

type TempoQuery = {
  filters?: TraceqlFilter[];
  query?: string; // Raw TraceQL query
  datasource?: DataSourceRef;
};

export interface TraceqlFilter {
  scope?: string;
  tag?: string;
  operator?: string;
  value?: string | string[];
}

export const linkConfigs: Array<PluginExtensionAddedLinkConfig<PluginExtensionPanelContext>> = [
  {
    targets: PluginExtensionPoints.DashboardPanelMenu,
    title: 'Open in Traces Drilldown',
    description: 'Open current query in the Traces Drilldown app',
    path: createAppUrl(),
    configure: (context?: PluginExtensionPanelContext) => contextToLink(context),
  } as PluginExtensionAddedLinkConfig,
  {
    targets: PluginExtensionPoints.ExploreToolbarAction,
    title: 'Open in Grafana Traces Drilldown',
    description: 'Try our new queryless experience for traces',
    path: createAppUrl(),
    configure: (context?: PluginExtensionPanelContext) => contextToLink(context),
  } as PluginExtensionAddedLinkConfig,
  {
    targets: 'grafana-assistant-app/navigateToDrilldown/v1',
    title: 'Grafana assistant link',
    description: 'Create a link to the Traces Drilldown app',
    path: createAppUrl(),
    configure: (context?: PluginExtensionPanelContext) => contextToLink(context),
  } as PluginExtensionAddedLinkConfig,
];

export function contextToLink(context?: PluginExtensionPanelContext) {
  if (!context) {
    return undefined;
  }

  const tempoQuery = context.targets.find((target) => target.datasource?.type === 'tempo') as TempoQuery | undefined;
  if (!tempoQuery || !tempoQuery.datasource?.uid) {
    return undefined;
  }

  // Try to get filters from the structured filters array first
  let filters = tempoQuery.filters?.filter(
    (filter) => filter.scope && filter.tag && filter.operator && filter.value && filter.value.length
  );

  // If no structured filters found, try to parse from raw query
  if ((!filters || filters.length === 0) && tempoQuery.query) {
    const parsedFilters = parseTraceQLQuery(tempoQuery.query);
    if (parsedFilters && parsedFilters.length > 0) {
      filters = parsedFilters.filter(
        (filter) => filter.scope && filter.tag && filter.operator && filter.value && filter.value.length
      );
    }
  }

  const params = new URLSearchParams();
  params.append(`var-${VAR_DATASOURCE}`, tempoQuery.datasource?.uid || '');

  // Add time range if available
  if (context.timeRange) {
    const timeRangeParams = toURLRange(context.timeRange);
    params.append(`from`, String(timeRangeParams.from));
    params.append(`to`, String(timeRangeParams.to));
  }

  // If no filters, return default URL with just datasource (and optional time range)
  if (!filters || filters.length === 0) {
    const url = createAppUrl(params);
    return {
      path: `${url}`,
    };
  }

  const statusFilter = filters.find((filter) => filter.tag === 'status');
  if (statusFilter) {
    params.append(`var-${VAR_METRIC}`, statusFilter.value === 'error' ? 'errors' : 'rate');
  }

  params.append('var-primarySignal', 'true');

  const getFilters = (filters: TraceqlFilter[]) => {
    return filters
      .filter((filter) => filter.tag !== 'status')
      .map((filter) => `${filter.scope}${getScopeSeparator(filter)}${filter.tag}|${filter.operator}|${filter.value}`);
  };
  getFilters(filters).forEach((filter) => params.append(`var-${VAR_FILTERS}`, filter));

  const url = createAppUrl(params);
  return {
    path: `${url}`,
  };
}

function createAppUrl(urlParams?: URLSearchParams): string {
  return `${EXPLORATIONS_ROUTE}${urlParams ? `?${urlParams.toString()}` : ''}`;
}

const intrinsics = [
  'event:name',
  'event:timeSinceStart',
  'instrumentation:name',
  'instrumentation:version',
  'link:spanID',
  'link:traceID',
  'span:duration',
  'span:id',
  'span:kind',
  'span:name',
  'span:status',
  'span:statusMessage',
  'trace:duration',
  'trace:id',
  'trace:rootName',
  'trace:rootService',
].map((fullName) => {
  const [scope, tag] = fullName.split(':');
  return {
    scope,
    tag,
  };
});

function isIntrinsic(filter: TraceqlFilter) {
  return intrinsics.some((intrinsic) => intrinsic.tag === filter.tag && intrinsic.scope === filter.scope);
}

function getScopeSeparator(filter: TraceqlFilter) {
  return isIntrinsic(filter) ? ':' : '.';
}
