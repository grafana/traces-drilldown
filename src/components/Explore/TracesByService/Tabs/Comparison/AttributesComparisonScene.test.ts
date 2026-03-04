import { DataFrame, FieldType } from '@grafana/data';

import { AttributesComparisonScene, hasSelectionValues } from './AttributesComparisonScene';

describe('hasSelectionValues', () => {
  it('returns true when Selection field has at least one value > 0', () => {
    const df: DataFrame = {
      name: 'attr',
      refId: 'attr',
      length: 2,
      fields: [
        { name: 'Value', type: FieldType.string, values: ['a', 'b'], config: {} },
        { name: 'Baseline', type: FieldType.number, values: [0.5, 0.5], config: {} },
        { name: 'Selection', type: FieldType.number, values: [0, 0.1], config: {} },
      ],
    };
    expect(hasSelectionValues(df)).toBe(true);
  });

  it('returns false when Selection field has only zeros', () => {
    const df: DataFrame = {
      name: 'attr',
      refId: 'attr',
      length: 2,
      fields: [
        { name: 'Value', type: FieldType.string, values: ['a', 'b'], config: {} },
        { name: 'Baseline', type: FieldType.number, values: [0.5, 0.5], config: {} },
        { name: 'Selection', type: FieldType.number, values: [0, 0], config: {} },
      ],
    };
    expect(hasSelectionValues(df)).toBe(false);
  });

  it('returns false when dataframe has no Selection field', () => {
    const df: DataFrame = {
      name: 'attr',
      refId: 'attr',
      length: 1,
      fields: [
        { name: 'Value', type: FieldType.string, values: ['a'], config: {} },
        { name: 'Baseline', type: FieldType.number, values: [1], config: {} },
      ],
    };
    expect(hasSelectionValues(df)).toBe(false);
  });

  it('returns false when Selection field has no values', () => {
    const df: DataFrame = {
      name: 'attr',
      refId: 'attr',
      length: 0,
      fields: [
        { name: 'Value', type: FieldType.string, values: [], config: {} },
        { name: 'Baseline', type: FieldType.number, values: [], config: {} },
        { name: 'Selection', type: FieldType.number, values: [], config: {} },
      ],
    };
    expect(hasSelectionValues(df)).toBe(false);
  });

  it('treats null/undefined in Selection values as zero', () => {
    const df: DataFrame = {
      name: 'attr',
      refId: 'attr',
      length: 2,
      fields: [
        { name: 'Value', type: FieldType.string, values: ['a', 'b'], config: {} },
        { name: 'Baseline', type: FieldType.number, values: [0.5, 0.5], config: {} },
        { name: 'Selection', type: FieldType.number, values: [null, undefined], config: {} },
      ],
    };
    expect(hasSelectionValues(df)).toBe(false);
  });

  it('returns true when only one Selection value is positive among nulls', () => {
    const df: DataFrame = {
      name: 'attr',
      refId: 'attr',
      length: 2,
      fields: [
        { name: 'Value', type: FieldType.string, values: ['a', 'b'], config: {} },
        { name: 'Baseline', type: FieldType.number, values: [0.5, 0.5], config: {} },
        { name: 'Selection', type: FieldType.number, values: [null, 0.01], config: {} },
      ],
    };
    expect(hasSelectionValues(df)).toBe(true);
  });
});

describe('AttributesComparisonScene', () => {
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;

  beforeEach(() => {
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  afterEach(() => {
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
  });

  describe('constructor hideBaselineOnlyPanels initialization', () => {
    it('uses state.hideBaselineOnlyPanels when provided as true', () => {
      (Storage.prototype.getItem as jest.Mock).mockReturnValue('false');
      const scene = new AttributesComparisonScene({ hideBaselineOnlyPanels: true });
      expect(scene.state.hideBaselineOnlyPanels).toBe(true);
    });

    it('uses state.hideBaselineOnlyPanels when provided as false', () => {
      (Storage.prototype.getItem as jest.Mock).mockReturnValue('true');
      const scene = new AttributesComparisonScene({ hideBaselineOnlyPanels: false });
      expect(scene.state.hideBaselineOnlyPanels).toBe(false);
    });

    it('falls back to localStorage "true" when state.hideBaselineOnlyPanels is undefined', () => {
      (Storage.prototype.getItem as jest.Mock).mockReturnValue('true');
      const scene = new AttributesComparisonScene({});
      expect(scene.state.hideBaselineOnlyPanels).toBe(true);
    });

    it('falls back to false when state is undefined and localStorage is not "true"', () => {
      (Storage.prototype.getItem as jest.Mock).mockReturnValue(null);
      const scene = new AttributesComparisonScene({});
      expect(scene.state.hideBaselineOnlyPanels).toBe(false);
    });

    it('falls back to false when state is undefined and localStorage is "false"', () => {
      (Storage.prototype.getItem as jest.Mock).mockReturnValue('false');
      const scene = new AttributesComparisonScene({});
      expect(scene.state.hideBaselineOnlyPanels).toBe(false);
    });

    it('reads from localStorage with the expected key', () => {
      (Storage.prototype.getItem as jest.Mock).mockReturnValue('true');
      new AttributesComparisonScene({});
      expect(Storage.prototype.getItem).toHaveBeenCalledWith('grafana.drilldown.traces.hideBaselineOnly');
    });
  });
});
