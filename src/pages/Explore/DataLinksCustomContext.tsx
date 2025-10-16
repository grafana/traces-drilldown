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
  timeRange?: TimeRange
};

export function DataLinksCustomContext(props: Props) {
  const dataLinksContext = useDataLinksContext?.();


  // @ts-expect-error: TS2774 This condition will always return true since this function is always defined. Did you mean to call it instead?
  // We expect the TS error because the function is not always defined if the DataLinksContext or useDataLinksContext are
  // not available during runtime (before Grafana 12.3.0)
  const postProcessingSupported = DataLinksContext?.Provider && dataLinksContext;

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
    const timeRange = linkModel?.interpolatedParams?.timeRange
    const linkDataSourceUid = linkModel?.interpolatedParams?.query?.datasource?.uid;

    const dataSourceType = getDataSourceSrv().getInstanceSettings(linkDataSourceUid)?.type;

    if (query && linkModel && query && dataSourceType === "loki" && timeRange) {
      const extensionLink = logsDrilldownExtension.fn({
        targets: [{
          ...query,
          datasource: {
            uid: linkDataSourceUid,
            type: dataSourceType,
          }
        }],
        timeRange: timeRange,
      });

      if (extensionLink?.path) {
        linkModel.href = extensionLink.path;
      }
    }

    return linkModel;
  }

  return <DataLinksContext.Provider value={{dataLinkPostProcessor}}>{children}</DataLinksContext.Provider>;
}
