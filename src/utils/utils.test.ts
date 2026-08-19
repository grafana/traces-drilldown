import { getLabelValueType, isBooleanValue, isNumberValue, isQuotedValue, toLabelValueType } from './utils';

describe('utils', () => {
  describe('isNumberValue', () => {
    it('should return true for numbers and numerical strings', () => {
      expect(isNumberValue(0)).toBe(true);
      expect(isNumberValue(Infinity)).toBe(true);
      expect(isNumberValue(-Infinity)).toBe(true);
      expect(isNumberValue(123)).toBe(true);
      expect(isNumberValue(123.45)).toBe(true);
      expect(isNumberValue(-123)).toBe(true);
      expect(isNumberValue(-123.45)).toBe(true);
      expect(isNumberValue('0')).toBe(true);
      expect(isNumberValue('123')).toBe(true);
      expect(isNumberValue(' 123 ')).toBe(true);
      expect(isNumberValue('123.45')).toBe(true);
      expect(isNumberValue('-123')).toBe(true);
      expect(isNumberValue(' -123 ')).toBe(true);
      expect(isNumberValue('-123.45')).toBe(true);
    });

    it('should return false for non numbers', () => {
      expect(isNumberValue(`"0"`)).toBe(false);
      expect(isNumberValue('Infinity')).toBe(false);
      expect(isNumberValue('-Infinity')).toBe(false);
      expect(isNumberValue(`"Infinity"`)).toBe(false);
      expect(isNumberValue(`"-Infinity"`)).toBe(false);
      expect(isNumberValue(`"123"`)).toBe(false);
      expect(isNumberValue(`"123.45"`)).toBe(false);
      expect(isNumberValue(`"-123"`)).toBe(false);
      expect(isNumberValue(`"-123.45"`)).toBe(false);
      expect(isNumberValue('true')).toBe(false);
      expect(isNumberValue('abc')).toBe(false);
      expect(isNumberValue(null)).toBe(false);
      expect(isNumberValue(undefined)).toBe(false);
      expect(isNumberValue(NaN)).toBe(false);
      expect(isNumberValue(true)).toBe(false);
      expect(isNumberValue({})).toBe(false);
      expect(isNumberValue(() => {})).toBe(false);
      expect(isNumberValue('')).toBe(false);
    });
  });

  describe('isBooleanValue', () => {
    it('should return true for booleans and boolean strings', () => {
      expect(isBooleanValue(true)).toBe(true);
      expect(isBooleanValue(false)).toBe(true);
      expect(isBooleanValue('true')).toBe(true);
      expect(isBooleanValue('false')).toBe(true);
      expect(isBooleanValue(' true ')).toBe(true);
      expect(isBooleanValue(' false ')).toBe(true);
      expect(isBooleanValue('TrUe')).toBe(true);
      expect(isBooleanValue('FaLsE')).toBe(true);
    });

    it('should return false for non booleans', () => {
      expect(isBooleanValue(`"true"`)).toBe(false);
      expect(isBooleanValue(`"false"`)).toBe(false);
      expect(isBooleanValue(`"TrUe"`)).toBe(false);
      expect(isBooleanValue(`"FaLsE"`)).toBe(false);
      expect(isBooleanValue(0)).toBe(false);
      expect(isBooleanValue(1)).toBe(false);
      expect(isBooleanValue(null)).toBe(false);
      expect(isBooleanValue(undefined)).toBe(false);
      expect(isBooleanValue(NaN)).toBe(false);
      expect(isBooleanValue({})).toBe(false);
      expect(isBooleanValue(() => {})).toBe(false);
      expect(isBooleanValue('')).toBe(false);
    });
  });

  describe('isQuotedValue', () => {
    it('should return true for quoted strings', () => {
      expect(isQuotedValue(`""`)).toBe(true);
      expect(isQuotedValue(`''`)).toBe(true);
      expect(isQuotedValue(`"0"`)).toBe(true);
      expect(isQuotedValue(`'0'`)).toBe(true);
      expect(isQuotedValue(` ' 0 ' `)).toBe(true);
      expect(isQuotedValue(` " 0 " `)).toBe(true);
      expect(isQuotedValue(`"true"`)).toBe(true);
      expect(isQuotedValue(`'true'`)).toBe(true);
      expect(isQuotedValue(` " true " `)).toBe(true);
      expect(isQuotedValue(` ' true ' `)).toBe(true);
    });

    it('should return false for non strings and strings without quotes', () => {
      expect(isQuotedValue(0)).toBe(false);
      expect(isQuotedValue('0')).toBe(false);
      expect(isQuotedValue(true)).toBe(false);
      expect(isQuotedValue('true')).toBe(false);
      expect(isQuotedValue('abc')).toBe(false);
      expect(isQuotedValue(null)).toBe(false);
      expect(isQuotedValue(undefined)).toBe(false);
      expect(isQuotedValue(NaN)).toBe(false);
      expect(isQuotedValue({})).toBe(false);
      expect(isQuotedValue(() => {})).toBe(false);
      expect(isQuotedValue('')).toBe(false);
    });
  });

  describe('getLabelValueType', () => {
    it('should return "quoted" for keys that should always be strings no matter what the value is', () => {
      expect(getLabelValueType(0, 'span.messaging.destination.partition.id')).toBe('quoted');
      expect(getLabelValueType(0, 'span.network.protocol.version')).toBe('quoted');
    });

    it('should return "bare" for keys that should always be keywords no matter what the value is', () => {
      expect(getLabelValueType('unset', 'status')).toBe('bare');
      expect(getLabelValueType('internal', 'kind')).toBe('bare');
      expect(getLabelValueType('ok', 'span:status')).toBe('bare');
      expect(getLabelValueType('producer', 'span:kind')).toBe('bare');
    });

    it('should return "bare" for keys that should always be durations no matter what the value is', () => {
      expect(getLabelValueType('10ms', 'duration')).toBe('bare');
      expect(getLabelValueType('1s', 'span:duration')).toBe('bare');
      expect(getLabelValueType('1m', 'trace:duration')).toBe('bare');
      expect(getLabelValueType('15µs', 'event:timeSinceStart')).toBe('bare');
    });

    it('should return "bare" for values that are numerical', () => {
      expect(getLabelValueType(0)).toBe('bare');
      expect(getLabelValueType(1)).toBe('bare');
      expect(getLabelValueType(-1)).toBe('bare');
      expect(getLabelValueType(123)).toBe('bare');
      expect(getLabelValueType(-123)).toBe('bare');
      expect(getLabelValueType(123.45)).toBe('bare');
      expect(getLabelValueType(-123.45)).toBe('bare');
      expect(getLabelValueType(Infinity)).toBe('bare');
      expect(getLabelValueType(-Infinity)).toBe('bare');
      expect(getLabelValueType('0')).toBe('bare');
      expect(getLabelValueType('1')).toBe('bare');
      expect(getLabelValueType('-1')).toBe('bare');
      expect(getLabelValueType('123')).toBe('bare');
      expect(getLabelValueType('-123')).toBe('bare');
      expect(getLabelValueType('123.45')).toBe('bare');
      expect(getLabelValueType('-123.45')).toBe('bare');
      expect(getLabelValueType(' 0 ')).toBe('bare');
    });

    it('should return "bare" for values that are boolean', () => {
      expect(getLabelValueType(true)).toBe('bare');
      expect(getLabelValueType(false)).toBe('bare');
      expect(getLabelValueType('true')).toBe('bare');
      expect(getLabelValueType('false')).toBe('bare');
      expect(getLabelValueType(' true ')).toBe('bare');
    });

    it('should return "quoted" for values that are quoted', () => {
      expect(getLabelValueType(`""`)).toBe('quoted');
      expect(getLabelValueType(`''`)).toBe('quoted');
      expect(getLabelValueType(`"true"`)).toBe('quoted');
      expect(getLabelValueType(`'true'`)).toBe('quoted');
      expect(getLabelValueType(` " true " `)).toBe('quoted');
      expect(getLabelValueType(` ' true ' `)).toBe('quoted');
      expect(getLabelValueType(`"0"`)).toBe('quoted');
      expect(getLabelValueType(`'0'`)).toBe('quoted');
      expect(getLabelValueType(` " 0 " `)).toBe('quoted');
      expect(getLabelValueType(` ' 0 ' `)).toBe('quoted');
    });

    it('should return "unknown" for all other values', () => {
      expect(getLabelValueType(null)).toBe('unknown');
      expect(getLabelValueType(undefined)).toBe('unknown');
      expect(getLabelValueType(NaN)).toBe('unknown');
      expect(getLabelValueType({})).toBe('unknown');
      expect(getLabelValueType(() => {})).toBe('unknown');
      expect(getLabelValueType('')).toBe('unknown');
      expect(getLabelValueType('Infinity')).toBe('unknown');
      expect(getLabelValueType('-Infinity')).toBe('unknown');
    });
  });

  describe('toLabelValueType', () => {
    it('should return "quoted" for a value that is "string"', () => {
      expect(toLabelValueType('string')).toBe('quoted');
    });

    it('should return "bare" for a value that is "int"', () => {
      expect(toLabelValueType('int', 0)).toBe('bare');
      expect(toLabelValueType('int', 1)).toBe('bare');
      expect(toLabelValueType('int', 1.1)).toBe('bare');
      expect(toLabelValueType('int', '0')).toBe('bare');
      expect(toLabelValueType('int', '1')).toBe('bare');
      expect(toLabelValueType('int', '1.1')).toBe('bare');
    });

    it('should return "bare" for a value that is "float"', () => {
      expect(toLabelValueType('float', 0)).toBe('bare');
      expect(toLabelValueType('float', 1)).toBe('bare');
      expect(toLabelValueType('float', 1.1)).toBe('bare');
      expect(toLabelValueType('float', '0')).toBe('bare');
      expect(toLabelValueType('float', '1')).toBe('bare');
      expect(toLabelValueType('float', '1.1')).toBe('bare');
    });

    it('should return "bare" for a value that is "bool"', () => {
      expect(toLabelValueType('bool', false)).toBe('bare');
      expect(toLabelValueType('bool', true)).toBe('bare');
      expect(toLabelValueType('bool', 'false')).toBe('bare');
      expect(toLabelValueType('bool', 'true')).toBe('bare');
    });

    it('should return "bare" for a value that is "duration"', () => {
      expect(toLabelValueType('duration', '0')).toBe('bare');
      expect(toLabelValueType('duration', '1')).toBe('bare');
      expect(toLabelValueType('duration', '1.1')).toBe('bare');
      expect(toLabelValueType('duration', '1ns')).toBe('bare');
      expect(toLabelValueType('duration', '1us')).toBe('bare');
      expect(toLabelValueType('duration', '1µs')).toBe('bare');
      expect(toLabelValueType('duration', '1ms')).toBe('bare');
      expect(toLabelValueType('duration', '1s')).toBe('bare');
      expect(toLabelValueType('duration', '1m')).toBe('bare');
      expect(toLabelValueType('duration', '1h')).toBe('bare');
      expect(toLabelValueType('duration', '1d')).toBe('bare');
      expect(toLabelValueType('duration', '1w')).toBe('bare');
      expect(toLabelValueType('duration', '1y')).toBe('bare');
    });

    it('should return "bare" for a value that is "keyword"', () => {
      expect(toLabelValueType('keyword', 'ok')).toBe('bare');
      expect(toLabelValueType('keyword', 'error')).toBe('bare');
      expect(toLabelValueType('keyword', 'unset')).toBe('bare');
      expect(toLabelValueType('keyword', 'unspecified')).toBe('bare');
      expect(toLabelValueType('keyword', 'internal')).toBe('bare');
      expect(toLabelValueType('keyword', 'server')).toBe('bare');
      expect(toLabelValueType('keyword', 'client')).toBe('bare');
      expect(toLabelValueType('keyword', 'producer')).toBe('bare');
      expect(toLabelValueType('keyword', 'consumer')).toBe('bare');
    });

    it('should return "unknown" for everything else', () => {
      expect(toLabelValueType(null)).toBe('unknown');
      expect(toLabelValueType(undefined)).toBe('unknown');
      expect(toLabelValueType(NaN)).toBe('unknown');
      expect(toLabelValueType({})).toBe('unknown');
      expect(toLabelValueType(() => {})).toBe('unknown');
      expect(toLabelValueType('')).toBe('unknown');
    });
  });
});
