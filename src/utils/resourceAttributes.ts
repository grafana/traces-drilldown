import {
  type IconName,
  type PluginExtensionAddedLinkConfig,
  PluginExtensionPoints,
  type PluginExtensionResourceAttributesContext,
} from '@grafana/data';

import { EXPLORATIONS_ROUTE, RESOURCE_ATTR, VAR_DATASOURCE, VAR_FILTERS, VAR_PRIMARY_SIGNAL } from './shared';

export type TraceResourceAttributeLinkConfig = {
  /** TraceView row key (`link.category === attribute.key`). Always required. */
  attributeName: string;
  /**
   * Resource attributes applied as TraceQL filters.
   * Defaults to `[attributeName]`. Omit the row key when a secondary attribute
   * should open a parent entity (e.g. container.name → k8s.deployment.name).
   */
  filters?: string[];
};

const HOST_OS_PROCESS_TELEMETRY_ATTRIBUTES = [
  'host.arch',
  'os.type',
  'os.description',
  'os.name',
  'os.version',
  'os.build_id',
  'process.pid',
  'process.parent_pid',
  'process.executable.name',
  'process.executable.path',
  'process.command',
  'process.command_line',
  'process.command_args',
  'process.owner',
  'process.runtime.name',
  'process.runtime.version',
  'process.runtime.description',
  'process.working_directory',
  'telemetry.sdk.name',
  'telemetry.sdk.language',
  'telemetry.sdk.version',
  'telemetry.distro.name',
  'telemetry.distro.version',
] as const;

/** withService — filter service.name plus this attribute */
const withService = (attributeName: string): TraceResourceAttributeLinkConfig => ({
  attributeName,
  filters: ['service.name', attributeName],
});

/** asEntity — show the link on this row, filter the parent entity */
const asEntity = (attributeName: string, entity: string): TraceResourceAttributeLinkConfig => ({
  attributeName,
  filters: [entity],
});

/** TRACE_RESOURCE_ATTRIBUTE_LINKS — rows with no helper filter only that attribute */
export const TRACE_RESOURCE_ATTRIBUTE_LINKS: TraceResourceAttributeLinkConfig[] = [
  { attributeName: 'service.name' },
  { attributeName: 'service.namespace' },
  withService('service.version'),
  withService('service.instance.id'),
  withService('deployment.environment'),
  withService('deployment.environment.name'),
  withService('k8s.namespace.name'),
  { attributeName: 'k8s.pod.name' },
  { attributeName: 'k8s.deployment.name' },
  { attributeName: 'k8s.node.name' },
  asEntity('k8s.container.name', 'k8s.deployment.name'),
  asEntity('container.name', 'k8s.deployment.name'),
  asEntity('container.id', 'k8s.pod.name'),
  asEntity('k8s.pod.uid', 'k8s.pod.name'),
  asEntity('k8s.pod.ip', 'k8s.pod.name'),
  asEntity('k8s.pod.start_time', 'k8s.pod.name'),
  ...HOST_OS_PROCESS_TELEMETRY_ATTRIBUTES.map((attributeName) => ({ attributeName })),
];

/** Visible label in TraceView (menu uses description, then title). */
export const RESOURCE_ATTRIBUTE_LINK_LABEL = 'Traces Drilldown';
export const RESOURCE_ATTRIBUTE_LINK_ICON: IconName = 'gf-traces';

const linkCopy = {
  title: RESOURCE_ATTRIBUTE_LINK_LABEL,
  description: RESOURCE_ATTRIBUTE_LINK_LABEL,
  icon: RESOURCE_ATTRIBUTE_LINK_ICON,
};

function attrValue(attributes: Record<string, string[]> | undefined, name: string): string | undefined {
  return attributes?.[name]?.[0]?.trim() || undefined;
}

/** filterNames — TraceQL filter keys; defaults to the row attribute */
function filterNames(config: TraceResourceAttributeLinkConfig): string[] {
  return config.filters ?? [config.attributeName];
}

/** makeTraceResourceAttributeLink — TraceView link (`category === attribute.key`) that opens Traces Drilldown */
export function makeTraceResourceAttributeLink(
  config: TraceResourceAttributeLinkConfig
): PluginExtensionAddedLinkConfig<PluginExtensionResourceAttributesContext> {
  const filters = filterNames(config);
  const required = [...new Set([config.attributeName, ...filters])];

  return {
    targets: [PluginExtensionPoints.TraceViewResourceAttributes],
    ...linkCopy,
    // TraceView matches the link to an attribute row via category === attribute.key
    category: config.attributeName,
    path: EXPLORATIONS_ROUTE,
    configure: (context) => {
      const values: Record<string, string> = {};

      for (const name of required) {
        const value = attrValue(context?.attributes, name);
        if (!value) {
          return undefined;
        }
        values[name] = value;
      }

      const datasourceUid = context?.datasource?.uid;
      if (!datasourceUid || context?.datasource?.type !== 'tempo') {
        return undefined;
      }

      const params = new URLSearchParams();
      params.set(`var-${VAR_DATASOURCE}`, datasourceUid);
      params.set(`var-${VAR_PRIMARY_SIGNAL}`, 'true');

      for (const name of filters) {
        params.append(`var-${VAR_FILTERS}`, `${RESOURCE_ATTR}${name}|=|${values[name]}`);
      }

      if (context.timeRange) {
        params.set('from', String(context.timeRange.from));
        params.set('to', String(context.timeRange.to));
      }

      return {
        ...linkCopy,
        path: `${EXPLORATIONS_ROUTE}?${params.toString()}`,
      };
    },
  };
}
