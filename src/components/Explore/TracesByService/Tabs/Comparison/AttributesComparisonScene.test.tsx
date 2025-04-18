import { DataFrame, Field, FieldType } from '@grafana/data';
import { getTotalForMetaType } from './AttributesComparisonScene';

describe('getTotalForMetaType', () => {
  const createField = (value: number, metaType?: string, labels: Record<string, string> = {}): Field => ({
    name: 'test',
    type: FieldType.number,
    values: [value],
    config: {},
    labels: metaType ? { ...labels, __meta_type: `"${metaType}"` } : labels,
  });

  const createFrame = (fields: Field[]): DataFrame => ({
    name: 'test',
    refId: 'test',
    fields,
    length: 1,
  });

  it('should return calculated total when total field is less than calculated total', () => {
    const frames = [
      createFrame([createField(80, 'baseline_total')]),
      createFrame([createField(50, 'baseline')]),
      createFrame([createField(50, 'baseline')]),
    ];
    
    const values = {
      'value1': [createField(50, 'baseline')],
      'value2': [createField(50, 'baseline')],
    };

    const result = getTotalForMetaType(frames, 'baseline', values);
    expect(result).toBe(100); // Returns calculated total (50 + 50) instead of total field (80)
  });

  it('should return 1 when total is 0', () => {
    const frames = [createFrame([createField(0, 'baseline_total')])];
    const values = {};

    const result = getTotalForMetaType(frames, 'baseline', values);
    expect(result).toBe(1);
  });

  it('should return calculated total when no total field exists', () => {
    const frames = [
      createFrame([createField(30, 'baseline')]),
      createFrame([createField(20, 'baseline')]),
    ];
    
    const values = {
      'value1': [createField(30, 'baseline')],
      'value2': [createField(20, 'baseline')],
    };

    const result = getTotalForMetaType(frames, 'baseline', values);
    expect(result).toBe(50);
  });

  it('should return total field value when greater than calculated total', () => {
    const frames = [
      createFrame([createField(100, 'baseline_total')]),
      createFrame([createField(30, 'baseline')]),
      createFrame([createField(20, 'baseline')]),
    ];
    
    const values = {
      'value1': [createField(30, 'baseline')],
      'value2': [createField(20, 'baseline')],
    };

    const result = getTotalForMetaType(frames, 'baseline', values);
    expect(result).toBe(100);
  });

  it('should handle empty values', () => {
    const frames = [createFrame([createField(0, 'baseline_total')])];
    const values = {};

    const result = getTotalForMetaType(frames, 'baseline', values);
    expect(result).toBe(1);
  });

  it('should handle no field values', () => {
    const frames = [createFrame([])];
    const values = {};

    const result = getTotalForMetaType(frames, 'baseline', values);
    expect(result).toBe(1);
  });
}); 
