import {
  PluginExtensionAddedLinkConfig,
  PluginExtensionPanelContext,
  PluginExtensionPoints,
  toURLRange
} from '@grafana/data';

import { DataSourceRef } from '@grafana/schema';
import { EXPLORATIONS_ROUTE, VAR_DATASOURCE, VAR_FILTERS, VAR_METRIC } from './shared';

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

const title = 'Open in Explore Traces';
const description = 'Open current query in the Explore Traces app';

export const linkConfigs: Array<{ targets: string | string[] } & PluginExtensionAddedLinkConfig<PluginExtensionPanelContext>> = [
  {
    targets: PluginExtensionPoints.DashboardPanelMenu,
    title,
    description,
    path: createAppUrl(),
    configure: contextToLink,
  },
];

export function contextToLink<T extends PluginExtensionPanelContext>(context?: T) {
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
      .map((filter) => `${filter.scope}.${filter.tag}|${filter.operator}|${filter.value}`);
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
