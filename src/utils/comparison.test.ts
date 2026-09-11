import { DataFrame } from '@grafana/data';
import { computeHighestDifference, getDefaultSelectionForMetric } from './comparison';
import { MetricFunction } from './shared';

describe('computeHighestDifference', () => {
  it('should return the correct max difference and index', () => {
    const frame: DataFrame = {
      fields: [
        { name: 'Baseline', values: [10, 20, 15] },
        { name: 'Selection', values: [15, 25, 10] },
      ],
    } as any;

    const result = computeHighestDifference(frame);
    expect(result).toEqual({ maxDifference: 5, maxDifferenceIndex: 0 });
  });

  it('should handle missing fields gracefully', () => {
    const frame: DataFrame = { fields: [] } as any;
    const result = computeHighestDifference(frame);
    expect(result).toEqual({ maxDifference: 0, maxDifferenceIndex: 0 });
  });

  it('should return zero difference if Baseline and Selection are identical', () => {
    const frame: DataFrame = {
      fields: [
        { name: 'Baseline', values: [10, 20, 15] },
        { name: 'Selection', values: [10, 20, 15] },
      ],
    } as any;

    const result = computeHighestDifference(frame);
    expect(result).toEqual({ maxDifference: 0, maxDifferenceIndex: 0 });
  });
});

describe('getDefaultSelectionForMetric', () => {
  it('should return undefined for metric "duration"', () => {
    const result = getDefaultSelectionForMetric('duration');
    expect(result).toBeUndefined();
  });

  it('should return a default selection for other metric functions', () => {
    const result = getDefaultSelectionForMetric('throughput' as MetricFunction);
    expect(result).toEqual({ query: 'status = error', type: 'auto' });
  });
});
