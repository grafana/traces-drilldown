import { BaselineColor, SelectionColor, getPanelConfig } from './allComparison';

function colorOverrides(panel: { state: { fieldConfig?: { overrides?: unknown[] } } }) {
  return panel.state.fieldConfig?.overrides ?? [];
}

function fixedColorForField(overrides: unknown[], fieldName: string) {
  for (const override of overrides) {
    const o = override as {
      matcher?: { options?: string };
      properties?: Array<{ id?: string; value?: { mode?: string; fixedColor?: string } }>;
    };
    if (o.matcher?.options !== fieldName) {
      continue;
    }
    const colorProp = o.properties?.find((p) => p.id === 'color' && p.value?.mode === 'fixed');
    if (colorProp?.value?.fixedColor) {
      return colorProp.value.fixedColor;
    }
  }
  return undefined;
}

describe('getPanelConfig comparison colors', () => {
  it('uses BaselineColor for baseline on every metric (not green)', () => {
    for (const metric of ['rate', 'errors', 'duration'] as const) {
      const panel = getPanelConfig(metric).build();
      const overrides = colorOverrides(panel);
      expect(fixedColorForField(overrides, 'Baseline')).toBe(BaselineColor);
      expect(fixedColorForField(overrides, 'Baseline')).not.toMatch(/green/);
    }
  });

  it('uses SelectionColor for duration selection', () => {
    const panel = getPanelConfig('duration').build();
    expect(fixedColorForField(colorOverrides(panel), 'Selection')).toBe(SelectionColor);
  });

  it('uses semi-dark-red for rate/errors selection', () => {
    expect(fixedColorForField(colorOverrides(getPanelConfig('rate').build()), 'Selection')).toBe('semi-dark-red');
    expect(fixedColorForField(colorOverrides(getPanelConfig('errors').build()), 'Selection')).toBe('semi-dark-red');
  });
});
