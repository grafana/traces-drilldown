import { Field, FieldType } from '@grafana/data';
import { aggregateExceptions, createTimeSeries, normalizeExceptionMessage } from './ExceptionUtils';

describe('ExceptionUtils', () => {
  describe('normalizeExceptionMessage', () => {
    it('should normalize whitespace in exception messages', () => {
      expect(normalizeExceptionMessage('  Error   with   spaces  ')).toBe('Error with spaces');
    });

    it('should handle empty strings', () => {
      expect(normalizeExceptionMessage('')).toBe('');
    });

    it('should handle newlines and tabs', () => {
      expect(normalizeExceptionMessage('Error\nwith\tnewlines')).toBe('Error with newlines');
    });
  });

  describe('createTimeSeries', () => {
    it('should create time series from timestamps', () => {
      const timestamps = [1000, 2000, 3000, 1500, 2500];
      const result = createTimeSeries(timestamps);
      
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ time: expect.any(Number), count: expect.any(Number) })
        ])
      );
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty timestamps', () => {
      expect(createTimeSeries([])).toEqual([]);
    });

    it('should handle single timestamp', () => {
      const result = createTimeSeries([1000]);
      expect(result).toEqual([{ time: 1000, count: 1 }]);
    });

    it('should sort results by time', () => {
      const timestamps = [3000, 1000, 2000];
      const result = createTimeSeries(timestamps);
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].time).toBeGreaterThanOrEqual(result[i - 1].time);
      }
    });

    it('should bucket timestamps correctly', () => {
      const baseTime = 1000000;
      const timestamps = [
        baseTime,
        baseTime + 100,  // Same bucket
        baseTime + 1000, // Different bucket
        baseTime + 1100  // Same as previous bucket
      ];
      
      const result = createTimeSeries(timestamps);
      expect(result.length).toBeLessThanOrEqual(timestamps.length);
    });
  });

  describe('aggregateExceptions', () => {
    const createMockField = (name: string, values: any[]): Field => ({
      name,
      type: FieldType.string,
      values,
      config: {},
      state: {}
    });

    const createTimeField = (values: number[]): Field => ({
      name: 'time',
      type: FieldType.time,
      values,
      config: {},
      state: {}
    });

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should aggregate exceptions correctly with all fields', () => {
      const messageField = createMockField('exception.message', [
        'Database connection failed',
        'Null pointer exception',
        'Database connection failed', // Duplicate
      ]);
      const typeField = createMockField('exception.type', [
        'SQLException',
        'NullPointerException',
        'SQLException',
      ]);
      const serviceField = createMockField('service.name', [
        'user-service',
        'payment-service',
        'user-service',
      ]);
      const timeField = createTimeField([
        1699999800000, 
        1699999900000,
        1699999950000, 
      ]);

      const result = aggregateExceptions(messageField, typeField, timeField, serviceField);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toBe('Database connection failed'); // Most frequent first
      expect(result.occurences[0]).toBe(2);
      expect(result.types[0]).toBe('SQLException');
      expect(result.services[0]).toBe('user-service');
      
      expect(result.messages[1]).toBe('Null pointer exception');
      expect(result.occurences[1]).toBe(1);
      expect(result.types[1]).toBe('NullPointerException');
      expect(result.services[1]).toBe('payment-service');
    });

    it('should handle missing optional fields', () => {
      const messageField = createMockField('exception.message', [
        'Error 1',
        'Error 2',
      ]);

      const result = aggregateExceptions(messageField);

      expect(result.messages).toEqual(['Error 1', 'Error 2']);
      expect(result.types).toEqual(['', '']);
      expect(result.services).toEqual(['', '']);
      expect(result.occurences).toEqual([1, 1]);
      expect(result.lastSeenTimes).toEqual(['', '']);
      expect(result.timeSeries).toEqual([[], []]);
    });

    it('should normalize duplicate messages', () => {
      const messageField = createMockField('exception.message', [
        'Error   message',
        'Error message', // Should be treated as same after normalization
        'Different error',
      ]);

      const result = aggregateExceptions(messageField);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toBe('Error message'); // Most frequent first
      expect(result.occurences[0]).toBe(2);
      expect(result.messages[1]).toBe('Different error');
      expect(result.occurences[1]).toBe(1);
    });

    it('should sort by occurrence count descending', () => {
      const messageField = createMockField('exception.message', [
        'Rare error',
        'Common error',
        'Common error',
        'Common error',
        'Medium error',
        'Medium error',
      ]);

      const result = aggregateExceptions(messageField);

      expect(result.messages).toEqual(['Common error', 'Medium error', 'Rare error']);
      expect(result.occurences).toEqual([3, 2, 1]);
    });

    it('should calculate last seen times correctly', () => {
      const messageField = createMockField('exception.message', ['Error']);
      const timeField = createTimeField([1699999940000]); // 60 seconds ago

      const result = aggregateExceptions(messageField, undefined, timeField);

      expect(result.lastSeenTimes[0]).toBe('1m ago');
    });

    it('should handle "Just now" for recent timestamps', () => {
      const messageField = createMockField('exception.message', ['Error']);
      const timeField = createTimeField([1699999970000]); // 30 seconds ago

      const result = aggregateExceptions(messageField, undefined, timeField);

      expect(result.lastSeenTimes[0]).toBe('Just now');
    });

    it('should handle hours and days for older timestamps', () => {
      const messageField = createMockField('exception.message', ['Error 1', 'Error 2']);
      const timeField = createTimeField([
        1699996400000, // 1 hour ago
        1699913600000, // 1 day ago
      ]);

      const result = aggregateExceptions(messageField, undefined, timeField);

      expect(result.lastSeenTimes).toContain('1h ago');
      expect(result.lastSeenTimes).toContain('1d ago');
    });

    it('should create time series for each exception', () => {
      const messageField = createMockField('exception.message', [
        'Error 1',
        'Error 1',
        'Error 2',
      ]);
      const timeField = createTimeField([1000, 2000, 3000]);

      const result = aggregateExceptions(messageField, undefined, timeField);

      expect(result.timeSeries).toHaveLength(2);
      expect(result.timeSeries[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ time: expect.any(Number), count: expect.any(Number) })
        ])
      );
    });

    it('should handle empty message field values', () => {
      const messageField = createMockField('exception.message', []);

      const result = aggregateExceptions(messageField);

      expect(result.messages).toEqual([]);
      expect(result.types).toEqual([]);
      expect(result.services).toEqual([]);
      expect(result.occurences).toEqual([]);
      expect(result.lastSeenTimes).toEqual([]);
      expect(result.timeSeries).toEqual([]);
    });

    it('should skip null/undefined messages', () => {
      const messageField = createMockField('exception.message', [
        'Valid error',
        null,
        undefined,
        '',
        'Another valid error',
      ]);

      const result = aggregateExceptions(messageField);

      expect(result.messages).toEqual(['Valid error', 'Another valid error']);
      expect(result.occurences).toEqual([1, 1]);
    });
  });
}); 
