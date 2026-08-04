import { barsPanelConfig } from './barsPanel';
import { linesPanelConfig } from './linesPanel';

function colorOverrides(panel: { state: { fieldConfig?: { overrides?: unknown[] } } }) {
  return panel.state.fieldConfig?.overrides ?? [];
}

function fixedColorsFromOverrides(overrides: unknown[]) {
  return overrides.flatMap((override) => {
    const o = override as {
      matcher?: { id?: string; options?: string };
      properties?: Array<{ id?: string; value?: { mode?: string; fixedColor?: string } }>;
    };
    return (o.properties ?? [])
      .filter((p) => p.id === 'color' && p.value?.mode === 'fixed')
      .map((p) => ({
        matcher: o.matcher?.options,
        fixedColor: p.value?.fixedColor,
      }));
  });
}

describe('barsPanelConfig', () => {
  it('uses blue for rate (not green)', () => {
    const panel = barsPanelConfig('rate').build();
    expect(fixedColorsFromOverrides(colorOverrides(panel))).toEqual([
      { matcher: '.*', fixedColor: 'blue' },
    ]);
  });

  it('uses semi-dark-red for errors', () => {
    const panel = barsPanelConfig('errors').build();
    expect(fixedColorsFromOverrides(colorOverrides(panel))).toEqual([
      { matcher: '.*', fixedColor: 'semi-dark-red' },
    ]);
  });

  it('applies axisWidth when provided', () => {
    const panel = barsPanelConfig('rate', 70).build();
    expect(panel.state.fieldConfig?.defaults?.custom?.axisWidth).toBe(70);
  });
});

describe('linesPanelConfig', () => {
  it('does not apply a fixed color when metric is omitted (Single layout)', () => {
    const panel = linesPanelConfig().build();
    expect(fixedColorsFromOverrides(colorOverrides(panel))).toEqual([]);
  });

  it('uses semi-dark-blue for duration when metric is set', () => {
    const panel = linesPanelConfig('duration').build();
    expect(fixedColorsFromOverrides(colorOverrides(panel))).toEqual([
      { matcher: '.*', fixedColor: 'semi-dark-blue' },
    ]);
  });

  it('uses blue for rate when metric is set', () => {
    const panel = linesPanelConfig('rate').build();
    expect(fixedColorsFromOverrides(colorOverrides(panel))).toEqual([
      { matcher: '.*', fixedColor: 'blue' },
    ]);
  });

  it('uses semi-dark-red for errors when metric is set', () => {
    const panel = linesPanelConfig('errors').build();
    expect(fixedColorsFromOverrides(colorOverrides(panel))).toEqual([
      { matcher: '.*', fixedColor: 'semi-dark-red' },
    ]);
  });
});
