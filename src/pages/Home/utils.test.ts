import { MetricFindValue } from "@grafana/data";
import { filterKeys, renderTraceQLLabelFilters } from "./utils";
import { EVENT_ATTR, EVENT_INTRINSIC, ignoredAttributes, ignoredAttributesHomeFilter } from "utils/shared";

describe('filterKeys', () => {
  it('should handle an empty input array', () => {
    const filteredKeys = filterKeys([]);
    expect(filteredKeys).toEqual([]);
  });

  it('should return correct keys', () => {
    const mockKeys: MetricFindValue[] = [
      { text: 'resource.cpu' },
      { text: 'resource.memory' },
      { text: 'span.duration' },
      { text: 'span.name' },
      { text: ignoredAttributes[0] },
      { text: ignoredAttributesHomeFilter[0] },
      { text: `${EVENT_ATTR}timestamp` },
      { text: `${EVENT_INTRINSIC}timestamp` },
    ];

    const filteredKeys = filterKeys(mockKeys);

    expect(filteredKeys).toEqual([
      { text: 'resource.cpu' },
      { text: 'resource.memory' },
      { text: 'span.duration' },
      { text: 'span.name' },
    ]);
  });

  it('should order keys correctly', () => {
    const mockKeys: MetricFindValue[] = [
      { text: ignoredAttributes[0] },
      { text: ignoredAttributesHomeFilter[0] },
      { text: 'span.duration' },
      { text: 'span.name' },
      { text: `${EVENT_ATTR}timestamp` },
      { text: `${EVENT_INTRINSIC}timestamp` },
      { text: 'resource.cpu' },
      { text: 'resource.memory' },
    ];

    const filteredKeys = filterKeys(mockKeys);

    expect(filteredKeys).toEqual([
      { text: 'resource.cpu' },
      { text: 'resource.memory' },
      { text: 'span.duration' },
      { text: 'span.name' },
    ]);
  });
});

describe('renderTraceQLLabelFilters', () => {
  it('returns an empty string when value is empty', () => {
    expect(renderTraceQLLabelFilters([{ key: 'testKey', operator: '=', value: '' }])).toBe('');
  });

  it('wraps value in quotes when key matches RESOURCE_ATTR or SPAN_ATTR and value is not a number', () => {    
    expect(renderTraceQLLabelFilters([{ key: 'resource.attr', operator: '=', value: 'testValue' }, { key: 'span.attr', operator: '=', value: 'testValue' }])).toBe('&& resource.attr="testValue" && span.attr="testValue"');
  });

  it('does not wrap value in quotes when it is already quoted', () => {
    expect(renderTraceQLLabelFilters([{ key: 'resource.attr', operator: '=', value: '"testValue"' }])).toBe('&& resource.attr="testValue"');
  });

  it('does not wrap number in quotes', () => {
    expect(renderTraceQLLabelFilters([{ key: 'custom.attr', operator: '=', value: '123' }])).toBe('&& custom.attr=123');
  });
});
