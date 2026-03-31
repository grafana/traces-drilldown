import { DataFrame } from '@grafana/data';

import { buildDistribution, getAttributeKeys } from './ExceptionComparison';
import { createField, createFrame } from './testUtils';

describe('buildDistribution', () => {
  it('builds sorted distribution with percent-of-total and percent-of-max', () => {
    const attributeKey = 'resource.service.name';
    const series: DataFrame[] = [
      createFrame([createField('time', [1, 2], {}, 'time'), createField('value', [10], { [attributeKey]: '"svc-a"' }, 'number')]),
      createFrame([createField('time', [1, 2], {}, 'time'), createField('value', [1], { [attributeKey]: '"svc-c"' }, 'number')]),
      createFrame([createField('time', [1, 2], {}, 'time'), createField('value', [5], { [attributeKey]: '"svc-b"' }, 'number')]),
    ];

    const items = buildDistribution(series, attributeKey, 10);

    expect(items.map((i) => i.value)).toEqual(['svc-a', 'svc-b', 'svc-c']);
    expect(items.map((i) => i.count)).toEqual([10, 5, 1]);
    expect(items[0].pctOfMax).toBeCloseTo(1);
    expect(items[1].pctOfMax).toBeCloseTo(0.5);
    expect(items[0].pctOfTotal).toBeCloseTo(10 / 16);
  });

  it('adds an Other bucket when exceeding maxRows', () => {
    const attributeKey = 'resource.service.name';
    const series: DataFrame[] = Array.from({ length: 8 }, (_, i) =>
      createFrame([createField('time', [1], {}, 'time'), createField('value', [1], { [attributeKey]: `"svc-${i}"` }, 'number')])
    );

    const items = buildDistribution(series, attributeKey, 3);
    expect(items).toHaveLength(4);
    expect(items[3].value).toBe('Other');
    expect(items[3].count).toBe(5);
  });

  it('returns empty when all counts are zero', () => {
    const attributeKey = 'resource.service.name';
    const series: DataFrame[] = [
      createFrame([createField('time', [1], {}, 'time'), createField('value', [0], { [attributeKey]: '"svc-a"' }, 'number')]),
    ];

    const items = buildDistribution(series, attributeKey, 10);
    expect(items).toEqual([]);
  });
});

describe('getAttributeKeys', () => {
  const defaults = ['resource.service.name', 'resource.service.namespace', 'name'];

  it('uses selected attributes when available', () => {
    const result = getAttributeKeys(['foo', 'bar'], ['foo', 'bar'], defaults);
    expect(result).toEqual(['foo', 'bar']);
  });

  it('filters selected attributes by available list', () => {
    const result = getAttributeKeys(['foo', 'bar'], ['bar'], defaults);
    expect(result).toEqual(['bar']);
  });

  it('falls back to defaults when filtered list is empty', () => {
    const result = getAttributeKeys(['foo'], ['bar'], defaults);
    expect(result).toEqual(defaults);
  });

  it('uses defaults when selected is undefined', () => {
    const result = getAttributeKeys(undefined, [], defaults);
    expect(result).toEqual(defaults);
  });
});


