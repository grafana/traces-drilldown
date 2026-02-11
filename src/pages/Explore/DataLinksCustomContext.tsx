import {
  DataLinkPostProcessor,
  DataLinksContext,
  PluginExtensionLink,
  TimeRange,
  useDataLinksContext,
} from '@grafana/data';
import { getDataSourceSrv, usePluginFunctions } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import React, { useCallback, useMemo, useRef } from 'react';

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
  const { children, embedded, timeRange } = props;

  const dataLinksContext = useDataLinksContext?.();

  // @ts-expect-error: TS2774 This condition will always return true since this function is always defined. Did you mean to call it instead?
  // We expect the TS error because the function is not always defined if the DataLinksContext or useDataLinksContext are
  // not available during runtime (before Grafana 12.3.0)
  const postProcessingSupported = DataLinksContext?.Provider && dataLinksContext;

  // usePluginFunctions is available in Grafana 11.6.0 while we support back to Grafana 11.5.0
  const extensions = usePluginFunctions<ContextForLinksFn>?.({
    extensionPointId: 'grafana-exploretraces-app/get-logs-drilldown-link/v1',
    limitPerPlugin: 1,
  });

  const logsDrilldownExtension = extensions?.functions?.[0] ?? undefined;

  // Use refs to keep stable callback identity regardless of whether upstream hooks return new references
  const dataLinksContextRef = useRef(dataLinksContext);
  dataLinksContextRef.current = dataLinksContext;

  const logsDrilldownExtensionRef = useRef(logsDrilldownExtension);
  logsDrilldownExtensionRef.current = logsDrilldownExtension;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dataLinkPostProcessor: DataLinkPostProcessor = useCallback((options) => {
    const ctx = dataLinksContextRef.current;
    const ext = logsDrilldownExtensionRef.current;

    if (!ctx || !ext) {
      return options.linkModel;
    }

    const linkModel = ctx.dataLinkPostProcessor(options);
    const query = linkModel?.interpolatedParams?.query;
    const timeRange = linkModel?.interpolatedParams?.timeRange;
    const linkDataSourceUid = linkModel?.interpolatedParams?.query?.datasource?.uid;

    const dataSourceType = getDataSourceSrv().getInstanceSettings(linkDataSourceUid)?.type;

    if (query && linkModel && dataSourceType === "loki" && timeRange) {
      const extensionLink = ext.fn({
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
  }, []);

  const contextValue = useMemo(() => ({ dataLinkPostProcessor }), [dataLinkPostProcessor]);

  if (embedded || !postProcessingSupported || !logsDrilldownExtension || !timeRange) {
    return <>{children}</>;
  }

  return <DataLinksContext.Provider value={contextValue}>{children}</DataLinksContext.Provider>;
}
