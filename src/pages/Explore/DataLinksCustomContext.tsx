import { DataLinkPostProcessor, PluginExtensionLink, TimeRange } from '@grafana/data';
import { getDataSourceSrv, usePluginFunctions } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import React from 'react';

// These are optional imports that may not be available in older Grafana versions
// @ts-ignore - DataLinksContext and useDataLinksContext may not exist in older versions
let DataLinksContext: any;
let useDataLinksContext: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dataModule = require('@grafana/data');
  DataLinksContext = dataModule.DataLinksContext;
  useDataLinksContext = dataModule.useDataLinksContext;
} catch (e) {
  // APIs not available in this Grafana version
}

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
  const postProcessingSupported =
    typeof DataLinksContext !== 'undefined' && DataLinksContext?.Provider && dataLinksContext;

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

    if (query && linkModel && query && dataSourceType === 'loki' && timeRange) {
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
