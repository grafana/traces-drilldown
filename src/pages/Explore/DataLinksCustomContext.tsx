import {
  DataLinkPostProcessor,
  DataLinksContext,
  PluginExtensionLink,
  TimeRange,
  useDataLinksContext,
} from '@grafana/data';
import { getDataSourceSrv, usePluginFunctions } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import React from 'react';

type ContextForLinks = {
  targets: DataQuery[];
  timeRange: TimeRange;
};

type ContextForLinksFn = (context: ContextForLinks) => PluginExtensionLink | undefined;

type Props = {
  children: React.ReactNode;
  embedded?: boolean;
  timeRange?: TimeRange;
};

export function DataLinksCustomContext(props: Props) {
  // Check if the APIs are available (they may not be in older Grafana versions)
  const dataLinksContext = typeof useDataLinksContext === 'function' ? useDataLinksContext() : undefined;

  // Check if both the context and provider are available
  const postProcessingSupported = typeof DataLinksContext !== 'undefined' && dataLinksContext;

  const { children, embedded, timeRange } = props;

  const { functions: logsDrilldownExtensions } = usePluginFunctions<ContextForLinksFn>({
    extensionPointId: 'grafana-exploretraces-app/get-logs-drilldown-link/v1',
    limitPerPlugin: 1,
  });

  const logsDrilldownExtension = logsDrilldownExtensions?.[0] ?? undefined;

  if (embedded || !postProcessingSupported || !logsDrilldownExtension || !timeRange) {
    return <>{children}</>;
  }

  const dataLinkPostProcessor: DataLinkPostProcessor = (options) => {
    const linkModel = dataLinksContext.dataLinkPostProcessor(options);
    const query = linkModel?.interpolatedParams?.query;
    const timeRange = linkModel?.interpolatedParams?.timeRange;
    const linkDataSourceUid = linkModel?.interpolatedParams?.query?.datasource?.uid;

    const dataSourceType = getDataSourceSrv().getInstanceSettings(linkDataSourceUid)?.type;

    if (query && linkModel && dataSourceType === 'loki' && timeRange) {
      const extensionLink = logsDrilldownExtension.fn({
        targets: [
          {
            ...query,
            datasource: {
              uid: linkDataSourceUid,
              type: dataSourceType,
            },
          },
        ],
        timeRange: timeRange,
      });

      if (extensionLink?.path) {
        linkModel.href = extensionLink.path;
      }
    }

    return linkModel;
  };

  return <DataLinksContext.Provider value={{ dataLinkPostProcessor }}>{children}</DataLinksContext.Provider>;
}
