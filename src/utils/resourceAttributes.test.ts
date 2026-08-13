import { type AbsoluteTimeRange, type PluginExtensionResourceAttributesContext } from '@grafana/data';

import pluginJson from '../plugin.json';
import {
  makeTraceResourceAttributeLink,
  RESOURCE_ATTRIBUTE_LINK_ICON,
  RESOURCE_ATTRIBUTE_LINK_LABEL,
  TRACE_RESOURCE_ATTRIBUTE_LINKS,
  type TraceResourceAttributeName,
} from './resourceAttributes';

const timeRange: AbsoluteTimeRange = { from: 1000, to: 2000 };

const context: PluginExtensionResourceAttributesContext = {
  datasource: { uid: 'tempo', type: 'tempo' },
  attributes: {
    'service.name': ['cart'],
    'service.version': ['1.2.3'],
    'k8s.container.name': ['cart'],
    'k8s.deployment.name': ['cart-deploy'],
  },
  timeRange,
};

function linkFor(attributeName: TraceResourceAttributeName) {
  const config = TRACE_RESOURCE_ATTRIBUTE_LINKS.find((c) => c.attributeName === attributeName);
  if (!config) {
    throw new Error(`Missing TRACE_RESOURCE_ATTRIBUTE_LINKS entry for ${attributeName}`);
  }
  return makeTraceResourceAttributeLink(config);
}

function configure(
  attributeName: TraceResourceAttributeName,
  overrides?: Partial<PluginExtensionResourceAttributesContext>
) {
  return linkFor(attributeName).configure?.({ ...context, ...overrides });
}

function drilldownUrl(path: string) {
  return new URL(path, 'https://example.com');
}

describe('TRACE_RESOURCE_ATTRIBUTE_LINKS', () => {
  it.each(TRACE_RESOURCE_ATTRIBUTE_LINKS)(
    'registers a unique group for $attributeName',
    ({ attributeName }) => {
      expect(TRACE_RESOURCE_ATTRIBUTE_LINKS.filter((c) => c.attributeName === attributeName)).toHaveLength(1);
      expect(linkFor(attributeName).group).toEqual({ name: attributeName });
    }
  );

  it('declares matching title and description in plugin.json', () => {
    expect(pluginJson.extensions?.addedLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targets: ['grafana/traceview/resource-attributes'],
          title: RESOURCE_ATTRIBUTE_LINK_LABEL,
          description: RESOURCE_ATTRIBUTE_LINK_LABEL,
        }),
      ])
    );
  });
});

describe('makeTraceResourceAttributeLink', () => {
  it('registers TraceView metadata', () => {
    const link = linkFor('service.name');

    expect(link.group).toEqual({ name: 'service.name' });
    expect(link.targets).toEqual(['grafana/traceview/resource-attributes']);
    expect(link.title).toBe(RESOURCE_ATTRIBUTE_LINK_LABEL);
    expect(link.description).toBe(RESOURCE_ATTRIBUTE_LINK_LABEL);
    expect(link.icon).toBe(RESOURCE_ATTRIBUTE_LINK_ICON);
  });

  it('filters to the row attribute by default', () => {
    const result = configure('service.name');
    const url = drilldownUrl(result!.path!);

    expect(result).toMatchObject({
      title: RESOURCE_ATTRIBUTE_LINK_LABEL,
      description: RESOURCE_ATTRIBUTE_LINK_LABEL,
      icon: RESOURCE_ATTRIBUTE_LINK_ICON,
    });
    expect(url.pathname).toBe('/a/grafana-exploretraces-app/explore');
    expect(url.searchParams.get('var-ds')).toBe('tempo');
    expect(url.searchParams.get('var-primarySignal')).toBe('true');
    expect(url.searchParams.getAll('var-filters')).toEqual(['resource.service.name|=|cart']);
    expect(url.searchParams.get('from')).toBe('1000');
    expect(url.searchParams.get('to')).toBe('2000');
  });

  it('filters to the service and the row attribute', () => {
    const url = drilldownUrl(configure('service.version')!.path!);

    expect(url.searchParams.getAll('var-filters')).toEqual([
      'resource.service.name|=|cart',
      'resource.service.version|=|1.2.3',
    ]);
  });

  it('filters to the parent entity, not the row attribute', () => {
    const url = drilldownUrl(configure('k8s.container.name')!.path!);

    expect(url.searchParams.getAll('var-filters')).toEqual(['resource.k8s.deployment.name|=|cart-deploy']);
  });

  it('omits the time range when context has none', () => {
    const url = drilldownUrl(configure('service.name', { timeRange: undefined })!.path!);

    expect(url.searchParams.has('from')).toBe(false);
    expect(url.searchParams.has('to')).toBe(false);
  });

  it('hides when a required attribute is missing', () => {
    expect(configure('service.name', { attributes: {} })).toBeUndefined();
  });

  it('hides when a required attribute is blank', () => {
    expect(configure('service.name', { attributes: { 'service.name': ['  '] } })).toBeUndefined();
  });

  it('hides when an extra filter attribute is missing', () => {
    expect(configure('service.version', { attributes: { 'service.version': ['1.2.3'] } })).toBeUndefined();
  });

  it('hides when the parent entity is missing', () => {
    expect(configure('k8s.container.name', { attributes: { 'k8s.container.name': ['cart'] } })).toBeUndefined();
  });

  it('hides when the datasource is not Tempo', () => {
    expect(configure('service.name', { datasource: { uid: 'loki', type: 'loki' } })).toBeUndefined();
  });

  it('hides when the datasource uid is missing', () => {
    expect(configure('service.name', { datasource: { uid: '', type: 'tempo' } })).toBeUndefined();
  });

  it('hides when context is missing', () => {
    expect(linkFor('service.name').configure?.(undefined)).toBeUndefined();
  });
});
