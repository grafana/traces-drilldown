import { AdHocVariableFilter, MetricFindValue } from "@grafana/data";
import { getDataSourceSrv, DataSourceWithBackend } from "@grafana/runtime";
import { AdHocFiltersVariable, sceneGraph } from "@grafana/scenes";
import { EVENT_ATTR, EVENT_INTRINSIC, ignoredAttributes, ignoredAttributesHomeFilter, RESOURCE_ATTR, SPAN_ATTR, VAR_DATASOURCE_EXPR } from "utils/shared";
import { isNumber } from "utils/utils";

export async function getTagKeysProvider(variable: AdHocFiltersVariable): Promise<{replace?: boolean, values: MetricFindValue[]}> {
  const dsVar = sceneGraph.interpolate(variable, VAR_DATASOURCE_EXPR);
  const datasource_ = await getDataSourceSrv().get(dsVar);
  if (!(datasource_ instanceof DataSourceWithBackend)) {
    console.error(new Error('getTagKeysProvider: invalid datasource!'));
    throw new Error('getTagKeysProvider: invalid datasource!');
  }
  
  const datasource = datasource_ as DataSourceWithBackend;
  if (datasource && datasource.getTagKeys) {
    const tagKeys = await datasource.getTagKeys();

    if (Array.isArray(tagKeys)) {
      const filteredKeys = filterKeys(tagKeys);
      return { replace: true, values: filteredKeys };
    } else {
      console.error(new Error('getTagKeysProvider: invalid tagKeys!'));
      return { values: [] };
    }
  } else {
    console.error(new Error('getTagKeysProvider: missing or invalid datasource!'));
    return { values: [] };
  }
}

export function filterKeys(keys: MetricFindValue[]): MetricFindValue[] {
  const resourceAttributes = keys.filter((k) => k.text?.includes(RESOURCE_ATTR));
  const spanAttributes = keys.filter((k) => k.text?.includes(SPAN_ATTR));
  const otherAttributes = keys.filter((k) => {
    return !k.text?.includes(RESOURCE_ATTR) && !k.text?.includes(SPAN_ATTR)
      && !k.text?.includes(EVENT_ATTR) && !k.text?.includes(EVENT_INTRINSIC)
      && ignoredAttributes.concat(ignoredAttributesHomeFilter).indexOf(k.text!) === -1;
  })
  return [...resourceAttributes, ...spanAttributes, ...otherAttributes];
}

export function renderTraceQLLabelFilters(filters: AdHocVariableFilter[]) {
  const expr = filters
    .filter((f) => f.key && f.operator && f.value)
    .map((filter) => renderFilter(filter))
    .join(' && ');
  return expr.length ? `&& ${expr}` : '';
}

const renderFilter = (filter: AdHocVariableFilter) => {
  if (!filter) {
    return '';
  } 
  
  let val = filter.value;
  if (val === undefined || val === null || val === '') {
    return '';
  }

  if (!isNumber.test(val) && !['kind'].includes(filter.key)) {
    if (typeof val === 'string' && !val.startsWith('"') && !val.endsWith('"')) {
      val = `"${val}"`;
    }
  }

  return `${filter.key}${filter.operator}${val}`;
}
