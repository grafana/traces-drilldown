import { GrafanaTheme2 } from '@grafana/data';

import { applyMetricSeriesColorOverrides, getMetricColor, getMetricColorName } from './getMetricColor';

describe('getMetricColorName', () => {
  it('maps metrics to palette names (rate is blue, not green)', () => {
    expect(getMetricColorName('duration')).toBe('semi-dark-blue');
    expect(getMetricColorName('errors')).toBe('semi-dark-red');
    expect(getMetricColorName('rate')).toBe('blue');
    expect(getMetricColorName(undefined)).toBe('blue');
  });

  it('never returns green for rate or duration', () => {
    expect(getMetricColorName('rate')).not.toMatch(/green/);
    expect(getMetricColorName('duration')).not.toMatch(/green/);
    expect(getMetricColorName('errors')).not.toMatch(/green/);
  });
});

describe('getMetricColor', () => {
  const mockTheme = {
    visualization: {
      getColorByName: (name: string) => `color-${name}`,
    },
  } as GrafanaTheme2;

  it('resolves palette names through the theme', () => {
    expect(getMetricColor(mockTheme, 'duration')).toBe('color-semi-dark-blue');
    expect(getMetricColor(mockTheme, 'errors')).toBe('color-semi-dark-red');
    expect(getMetricColor(mockTheme, 'rate')).toBe('color-blue');
    expect(getMetricColor(mockTheme, undefined)).toBe('color-blue');
  });
});

describe('applyMetricSeriesColorOverrides', () => {
  function collectOverrides(metric: Parameters<typeof applyMetricSeriesColorOverrides>[1]) {
    const calls: Array<{ regex: string; color: string; mode: string }> = [];
    const overrides = {
      matchFieldsWithNameByRegex: (regex: string) => ({
        overrideColor: ({ mode, fixedColor }: { mode: string; fixedColor: string }) => {
          calls.push({ regex, color: fixedColor, mode });
        },
      }),
    };
    applyMetricSeriesColorOverrides(overrides, metric);
    return calls;
  }

  it.each([
    ['rate', 'blue'],
    ['errors', 'semi-dark-red'],
    ['duration', 'semi-dark-blue'],
  ] as const)('applies a single fixed %s color to all fields', (metric, color) => {
    expect(collectOverrides(metric)).toEqual([{ regex: '.*', color, mode: 'fixed' }]);
  });
});
