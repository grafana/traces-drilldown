import {
  PluginExtensionAddedLinkConfig,
  PluginExtensionPanelContext,
  PluginExtensionPoints, RawTimeRange,
  toURLRange
} from '@grafana/data';

import {DataQuery, DataSourceRef} from '@grafana/schema';
import {EXPLORATIONS_ROUTE, VAR_DATASOURCE, VAR_FILTERS, VAR_METRIC} from './shared';

type TempoQuery = {
  filters?: TraceqlFilter[];
  datasource?: DataSourceRef;
};

export interface TraceqlFilter {
  scope?: string;
  tag?: string;
  operator?: string;
  value?: (string | string[]);
}

type PluginExtensionExploreContext = {
  targets: DataQuery[];
  timeRange: RawTimeRange;
};

export const linkConfigs: Array<{ targets: string | string[] } & PluginExtensionAddedLinkConfig<PluginExtensionPanelContext>> = [
  {
    targets: PluginExtensionPoints.DashboardPanelMenu,
    title: 'Open in Explore Traces',
    description: 'Open current query in the Explore Traces app',
    path: createAppUrl(),
    configure: (context?: PluginExtensionPanelContext) => contextToLink(context),
  },
  {
    targets: PluginExtensionPoints.ExploreToolbarAction,
    title: "Open in Grafana Traces Drilldown",
    description: 'Try our new queryless experience for traces',
    path: createAppUrl(),
    configure: (context?: PluginExtensionExploreContext) => contextToLink(context),
  }
];

export function contextToLink(context?: PluginExtensionPanelContext | PluginExtensionExploreContext) {
  if (!context) {
    return undefined;
  }

  const tempoQuery = context.targets.find((target) => target.datasource?.type === 'tempo') as TempoQuery | undefined;
  if (!tempoQuery || !tempoQuery.datasource?.uid) {
    return undefined;
  }

  const filters = tempoQuery.filters?.filter((filter) => filter.scope && filter.tag && filter.operator && filter.value && filter.value.length);
  if (!filters || filters.length === 0) {
    return undefined;
  }

  const params = new URLSearchParams();
  params.append(`var-${VAR_DATASOURCE}`, tempoQuery.datasource?.uid || '');

  const timeRangeParams = toURLRange(context.timeRange);
  params.append(`from`, String(timeRangeParams.from));
  params.append(`to`, String(timeRangeParams.to));

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
].map(fullName => {
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
