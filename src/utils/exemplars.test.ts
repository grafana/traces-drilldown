import { of, Observable } from 'rxjs';
import { DataFrame, Field, FieldType } from '@grafana/data';
import { LocationService } from '@grafana/runtime';
import { CustomTransformerDefinition } from '@grafana/scenes';
import { exemplarsTransformations } from './exemplars';

type TransformOperator = () => (source: Observable<DataFrame[]>) => Observable<DataFrame[]>;

describe('exemplarsTransformations', () => {
  const mockLocationService: Partial<LocationService> = {
    partial: jest.fn(),
  };

  const createExemplarFrame = (
    traceIds: Array<string | null | undefined>, 
    values: Array<number | null | undefined>
  ): DataFrame => {
    const traceIdField: Field = {
      name: 'traceId',
      type: FieldType.string,
      config: {},
      values: traceIds,
    };

    const valueField: Field = {
      name: 'Value',
      type: FieldType.number,
      config: {},
      values: values,
    };

    const timestampField: Field = {
      name: 'timestamp',
      type: FieldType.time,
      config: {},
      values: traceIds.map((_, i) => Date.now() + i * 1000),
    };

    return {
      name: 'exemplar',
      length: traceIds.length,
      fields: [traceIdField, valueField, timestampField],
      meta: {},
    };
  };

  it('should pass through non-exemplar frames without modification', (done) => {
    const nonExemplarFrame: DataFrame = {
      name: 'not-exemplar',
      length: 3,
      fields: [
        { name: 'field1', type: FieldType.string, config: {}, values: ['a', 'b', 'c'] },
        { name: 'field2', type: FieldType.number, config: {}, values: [1, 2, 3] },
      ],
      meta: {},
    };

    const source = of([nonExemplarFrame]);
    const transformations = exemplarsTransformations(mockLocationService as LocationService);
    const transformer = transformations[0] as CustomTransformerDefinition & { operator: TransformOperator };
    const transformation = transformer.operator();

    transformation(source).subscribe((result: DataFrame[]) => {
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(nonExemplarFrame);
      expect(result[0].length).toBe(3);
      done();
    });
  });

  it('should not filter exemplar frames with all valid data', (done) => {
    const validExemplarFrame = createExemplarFrame(
      ['trace-1', 'trace-2', 'trace-3'],
      [1, 2, 3]
    );

    const source = of([validExemplarFrame]);
    const transformations = exemplarsTransformations(mockLocationService as LocationService);
    const transformer = transformations[0] as CustomTransformerDefinition & { operator: TransformOperator };
    const transformation = transformer.operator();

    transformation(source).subscribe((result: DataFrame[]) => {
      expect(result).toHaveLength(1);
      expect(result[0].length).toBe(3);
      expect(result[0].fields[0].values).toEqual(['trace-1', 'trace-2', 'trace-3']);
      expect(result[0].fields[1].values).toEqual([1, 2, 3]);
      done();
    });
  });

  it('should filter out rows with null traceIds', (done) => {
    const frameWithNullTraceIds = createExemplarFrame(
      ['trace-1', null, 'trace-3', undefined, ''],
      [1, 2, 3, 4, 5]
    );

    const source = of([frameWithNullTraceIds]);
    const transformations = exemplarsTransformations(mockLocationService as LocationService);
    const transformer = transformations[0] as CustomTransformerDefinition & { operator: TransformOperator };
    const transformation = transformer.operator();

    transformation(source).subscribe((result: DataFrame[]) => {
      expect(result).toHaveLength(1);
      expect(result[0].length).toBe(2); // Only 2 valid rows
      expect(result[0].fields[0].values).toEqual(['trace-1', 'trace-3']);
      expect(result[0].fields[1].values).toEqual([1, 3]);
      done();
    });
  });

  it('should filter out rows with zero values', (done) => {
    const frameWithZeroValues = createExemplarFrame(
      ['trace-1', 'trace-2', 'trace-3', 'trace-4'],
      [1, 0, 3, 0]
    );

    const source = of([frameWithZeroValues]);
    const transformations = exemplarsTransformations(mockLocationService as LocationService);
    const transformer = transformations[0] as CustomTransformerDefinition & { operator: TransformOperator };
    const transformation = transformer.operator();

    transformation(source).subscribe((result: DataFrame[]) => {
      expect(result).toHaveLength(1);
      expect(result[0].length).toBe(2); // Only 2 valid rows
      expect(result[0].fields[0].values).toEqual(['trace-1', 'trace-3']);
      expect(result[0].fields[1].values).toEqual([1, 3]);
      done();
    });
  });

  it('should filter out rows with null values', (done) => {
    const frameWithNullValues = createExemplarFrame(
      ['trace-1', 'trace-2', 'trace-3', 'trace-4'],
      [1, null, 3, undefined]
    );

    const source = of([frameWithNullValues]);
    const transformations = exemplarsTransformations(mockLocationService as LocationService);
    const transformer = transformations[0] as CustomTransformerDefinition & { operator: TransformOperator };
    const transformation = transformer.operator();

    transformation(source).subscribe((result: DataFrame[]) => {
      expect(result).toHaveLength(1);
      expect(result[0].length).toBe(2); // Only 2 valid rows
      expect(result[0].fields[0].values).toEqual(['trace-1', 'trace-3']);
      expect(result[0].fields[1].values).toEqual([1, 3]);
      done();
    });
  });

  it('should filter out rows with mixed invalid data', (done) => {
    const frameWithMixedInvalidData = createExemplarFrame(
      ['trace-1', null, 'trace-3', 'trace-4', 'trace-5', 'trace-6'],
      [1, 2, 0, null, 5, undefined]
    );

    const source = of([frameWithMixedInvalidData]);
    const transformations = exemplarsTransformations(mockLocationService as LocationService);
    const transformer = transformations[0] as CustomTransformerDefinition & { operator: TransformOperator };
    const transformation = transformer.operator();

    transformation(source).subscribe((result: DataFrame[]) => {
      expect(result).toHaveLength(1);
      expect(result[0].length).toBe(2); // Only 2 valid rows
      expect(result[0].fields[0].values).toEqual(['trace-1', 'trace-5']);
      expect(result[0].fields[1].values).toEqual([1, 5]);
      done();
    });
  });

  it('should add trace links to the traceId field', (done) => {
    const validExemplarFrame = createExemplarFrame(
      ['trace-1', 'trace-2'],
      [1, 2]
    );

    const source = of([validExemplarFrame]);
    const transformations = exemplarsTransformations(mockLocationService as LocationService);
    const transformer = transformations[0] as CustomTransformerDefinition & { operator: TransformOperator };
    const transformation = transformer.operator();

    transformation(source).subscribe((result: DataFrame[]) => {
      const traceIdField = result[0].fields[0];
      expect(traceIdField.config.links).toBeDefined();
      expect(traceIdField.config.links?.length).toBe(1);
      expect(traceIdField.config.links?.[0].title).toBe('View trace');
      expect(traceIdField.config.links?.[0].url).toBe('#${__value.raw}');
      
      // Test the onClick handler
      const mockEvent = {
        e: {
          stopPropagation: jest.fn(),
          target: {
            parentElement: {
              parentElement: {
                href: 'http://localhost:3000/#trace-abc-123'
              }
            }
          }
        }
      };
      
      traceIdField.config.links?.[0].onClick!(mockEvent as any);
      expect(mockLocationService.partial).toHaveBeenCalledWith({
        traceId: 'trace-abc-123'
      });
      
      done();
    });
  });

  it('should handle an empty exemplar frame', (done) => {
    const emptyExemplarFrame = createExemplarFrame([], []);

    const source = of([emptyExemplarFrame]);
    const transformations = exemplarsTransformations(mockLocationService as LocationService);
    const transformer = transformations[0] as CustomTransformerDefinition & { operator: TransformOperator };
    const transformation = transformer.operator();

    transformation(source).subscribe((result: DataFrame[]) => {
      expect(result).toHaveLength(1);
      expect(result[0].length).toBe(0);
      done();
    });
  });
}); 
