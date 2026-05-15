import { Field, FieldType } from '@grafana/data';
import {
  aggregateExceptions,
  createTimeSeries,
  getExceptionGroupingKey,
  formatExceptionMessageTraceQLFilter,
  getExceptionMessageFilter,
  normalizeExceptionMessage,
  normalizedExceptionMessageNeedsRegexMatch,
  normalizedExceptionMessageToTraceQLRegexPattern,
} from './ExceptionUtils';

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

    it('should normalize volatile identifiers in exception messages', () => {
      expect(
        normalizeExceptionMessage('Request 123 failed for 4f4e6f95-4a67-4fce-90b0-51e8b8fb4d4a from 10.0.0.1 at 2026-01-20T12:34:56Z')
      ).toBe('Request <num> failed for <uuid> from <ip> at <timestamp>');
    });

    it('should collapse http(s) URLs to group messages that differ only by path', () => {
      const a =
        'Error: HttpException: Connection closed before full header was received, uri = https://oncall-prod-us-central-1.grafana.net/oncall/api/internal/v1/user';
      const b =
        'Error: HttpException: Connection closed before full header was received, uri = https://oncall-prod-us-central-2.grafana.net/oncall/mobile_app/v1/gateway/incident/api/OrgService.GetOrg';
      const expected =
        'Error: HttpException: Connection closed before full header was received, uri = <url>';
      expect(normalizeExceptionMessage(a)).toBe(expected);
      expect(normalizeExceptionMessage(b)).toBe(expected);
    });
  });

  describe('normalizedExceptionMessageToTraceQLRegexPattern', () => {
    it('matches raw URLs against grouped messages with <url>', () => {
      const normalized =
        'Error: HttpException: Connection closed before full header was received, uri = <url>';
      const pattern = normalizedExceptionMessageToTraceQLRegexPattern(normalized);
      expect(normalizedExceptionMessageNeedsRegexMatch(normalized)).toBe(true);
      const re = new RegExp(pattern);
      expect(
        re.test(
          'Error: HttpException: Connection closed before full header was received, uri = https://oncall-prod-us-central-1.grafana.net/oncall/api/internal/v1/user'
        )
      ).toBe(true);
      expect(
        re.test(
          'Error: HttpException: Connection closed before full header was received, uri = https://oncall-prod-us-central-2.grafana.net/oncall/mobile_app/v1/gateway/incident/api/OrgService.GetOrg'
        )
      ).toBe(true);
    });

    it('matches numeric placeholders', () => {
      const normalized = 'HTTP <num> for path item-<num>';
      const re = new RegExp(normalizedExceptionMessageToTraceQLRegexPattern(normalized));
      expect(re.test('HTTP 500 for path item-42')).toBe(true);
    });

    it('matches HttpException content-length messages with numeric placeholders', () => {
      const normalized =
        'Error: HttpException: Content size below specified contentLength. <num> bytes written but expected <num>., uri = <url>';
      const pattern = normalizedExceptionMessageToTraceQLRegexPattern(normalized);
      const re = new RegExp(pattern);

      expect(
        re.test(
          'Error: HttpException: Content size below specified contentLength. 35113 bytes written but expected 5242880., uri = https://oncall-prod-us-central-1.grafana.net/oncall/api/internal/v1/user'
        )
      ).toBe(true);
      expect(pattern).toContain('[0-9]+');
      expect(pattern).not.toContain('\\d+');
    });

    it('allows flexible whitespace between literal segments', () => {
      const normalized = 'Error happened at <timestamp>';
      const re = new RegExp(normalizedExceptionMessageToTraceQLRegexPattern(normalized));
      expect(re.test('Error   happened\tat 2026-05-07T09:14:00Z')).toBe(true);
    });
  });

  describe('getExceptionGroupingKey', () => {
    it('should include exception type, first chars, last chars, and length', () => {
      const normalized = 'Timeout while processing event payload from gateway';
      expect(getExceptionGroupingKey(normalized, 'TimeoutException')).toBe(
        'TimeoutException|Timeout while proces|payload from gateway|51'
      );
    });
  });

  describe('getExceptionMessageFilter', () => {
    it('uses exact match for literal messages', () => {
      expect(getExceptionMessageFilter('Database connection failed', 'include')).toEqual({
        value: 'Database connection failed',
        operator: '=',
      });
      expect(getExceptionMessageFilter('Database connection failed', 'exclude')).toEqual({
        value: 'Database connection failed',
        operator: '!=',
      });
    });

    it('uses regex match for normalized placeholder messages', () => {
      const message = 'Error: HttpException: Connection closed before full header was received, uri = <url>';
      const include = getExceptionMessageFilter(message, 'include');
      expect(include.operator).toBe('=~');
      expect(include.value).toContain('https?://');

      const exclude = getExceptionMessageFilter(message, 'exclude');
      expect(exclude.operator).toBe('!~');
      expect(exclude.value).toBe(include.value);
    });
  });

  describe('formatExceptionMessageTraceQLFilter', () => {
    it('formats literal messages with exact match', () => {
      expect(formatExceptionMessageTraceQLFilter('Database connection failed')).toBe(
        'event.exception.message = "Database connection failed"'
      );
    });

    it('formats placeholder messages with regex match', () => {
      const clause = formatExceptionMessageTraceQLFilter(
        'Error: HttpException: Connection closed before full header was received, uri = <url>'
      );
      expect(clause).toContain('event.exception.message =~ "');
      expect(clause).toContain('https?://');
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
      expect(result.occurrences[0]).toBe(2);
      expect(result.types[0]).toBe('SQLException');
      expect(result.services[0]).toBe('user-service');
      
      expect(result.messages[1]).toBe('Null pointer exception');
      expect(result.occurrences[1]).toBe(1);
      expect(result.types[1]).toBe('NullPointerException');
      expect(result.services[1]).toBe('payment-service');
    });

    it('should handle missing optional fields', () => {
      const messageField = createMockField('exception.message', [
        'Error 1',
        'Error 2',
      ]);

      const result = aggregateExceptions(messageField);

      expect(result.messages).toEqual(['Error <num>']);
      expect(result.types).toEqual(['']);
      expect(result.services).toEqual(['']);
      expect(result.occurrences).toEqual([2]);
      expect(result.lastSeenTimes).toEqual(['']);
      expect(result.timeSeries).toEqual([[]]);
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
      expect(result.occurrences[0]).toBe(2);
      expect(result.messages[1]).toBe('Different error');
      expect(result.occurrences[1]).toBe(1);
    });

    it('should group HttpException messages that differ only by request URI', () => {
      const messageField = createMockField('exception.message', [
        'Error: HttpException: Connection closed before full header was received, uri = https://oncall-prod-us-central-1.grafana.net/oncall/api/internal/v1/user',
        'Error: HttpException: Connection closed before full header was received, uri = https://oncall-prod-us-central-2.grafana.net/oncall/mobile_app/v1/gateway/incident/api/OrgService.GetOrg',
      ]);
      const typeField = createMockField('exception.type', ['HttpException', 'HttpException']);

      const result = aggregateExceptions(messageField, typeField);

      expect(result.messages).toHaveLength(1);
      expect(result.occurrences[0]).toBe(2);
      expect(result.messages[0]).toContain('<url>');
      expect(result.types[0]).toBe('HttpException');
      expect(result.groupedMessages[0]).toEqual([
        'Error: HttpException: Connection closed before full header was received, uri = https://oncall-prod-us-central-1.grafana.net/oncall/api/internal/v1/user',
        'Error: HttpException: Connection closed before full header was received, uri = https://oncall-prod-us-central-2.grafana.net/oncall/mobile_app/v1/gateway/incident/api/OrgService.GetOrg',
      ]);
    });

    it('should group long similar messages by first and last 20 chars', () => {
      const messageField = createMockField('exception.message', [
        'Payment failed while processing customer alpha request due to timeout in upstream dependency',
        'Payment failed while processing customer bravo request due to timeout in upstream dependency',
        'Completely different problem in another subsystem',
      ]);
      const typeField = createMockField('exception.type', [
        'TimeoutException',
        'TimeoutException',
        'OtherException',
      ]);

      const result = aggregateExceptions(messageField, typeField);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toBe(
        'Payment failed while processing customer alpha request due to timeout in upstream dependency'
      );
      expect(result.occurrences[0]).toBe(2);
      expect(result.types[0]).toBe('TimeoutException');
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
      expect(result.occurrences).toEqual([3, 2, 1]);
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
      const messageField = createMockField('exception.message', ['Error one', 'Error two']);
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
        'Error alpha',
        'Error alpha',
        'Error beta',
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
      expect(result.occurrences).toEqual([]);
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
      expect(result.occurrences).toEqual([1, 1]);
    });
  });
}); 
