import { FieldType, type DataFrame } from '@grafana/data';

import {
  generateMetricsQuery,
  generateMetricsQueryForBreakdownTile,
  getMetricsTempoQuery,
} from './generateMetricsQuery';
import { ALL } from '../../../utils/shared';

describe('generateMetricsQuery', () => {
  it('should generate a basic rate query', () => {
    const result = generateMetricsQuery({ metric: 'rate' });
    expect(result).toEqual('{${primarySignal} && ${filters}} | rate() ');
  });

  it('should generate an errors query', () => {
    const result = generateMetricsQuery({ metric: 'errors' });
    expect(result).toEqual('{${primarySignal} && ${filters} && status=error} | rate() ');
  });

  it('should generate a duration query', () => {
    const result = generateMetricsQuery({ metric: 'duration' });
    expect(result).toEqual(
      '{${primarySignal} && ${filters}} | quantile_over_time(duration, ${durationPercentiles:csv}) '
    );
  });

  it('should add extra filters if provided', () => {
    const result = generateMetricsQuery({
      metric: 'rate',
      extraFilters: 'name="test"',
    });
    expect(result).toEqual('{${primarySignal} && ${filters} && name="test"} | rate() ');
  });

  it('should handle groupByKey when provided', () => {
    const result = generateMetricsQuery({
      metric: 'rate',
      groupByKey: 'serviceName',
    });
    expect(result).toEqual('{${primarySignal} && ${filters} && serviceName != nil} | rate() by(serviceName)');
  });

  it('should not add groupByKey filter when groupByKey is ALL', () => {
    const result = generateMetricsQuery({
      metric: 'rate',
      groupByKey: ALL,
    });
    expect(result).toEqual('{${primarySignal} && ${filters}} | rate() ');
  });

  it('should omit != nil when appendGroupByNilGuard is false', () => {
    const result = generateMetricsQuery({
      metric: 'rate',
      groupByKey: 'serviceName',
      extraFilters: 'serviceName="foo"',
      appendGroupByNilGuard: false,
    });
    expect(result).toEqual('{${primarySignal} && ${filters} && serviceName="foo"} | rate() by(serviceName)');
  });
});

describe('generateMetricsQueryForBreakdownTile', () => {
  const frameWithServiceLabel: DataFrame = {
    name: 'slice',
    length: 1,
    fields: [
      {
        name: 'Value',
        type: FieldType.number,
        values: [1],
        labels: { 'resource.service.name': '"checkout"' },
        config: {},
      },
    ],
  };

  it('matches aggregate query when group-by is All', () => {
    expect(generateMetricsQueryForBreakdownTile('rate', ALL, frameWithServiceLabel)).toEqual(
      generateMetricsQuery({ metric: 'rate' })
    );
  });

  it('matches aggregate query when group-by attribute is empty', () => {
    expect(generateMetricsQueryForBreakdownTile('rate', '', frameWithServiceLabel)).toEqual(
      generateMetricsQuery({ metric: 'rate' })
    );
  });

  it('adds equality filter and by() without redundant != nil when value is pinned', () => {
    expect(generateMetricsQueryForBreakdownTile('rate', 'resource.service.name', frameWithServiceLabel)).toEqual(
      '{${primarySignal} && ${filters} && resource.service.name="checkout"} | rate() by(resource.service.name)'
    );
  });

  it.each([
    ['status', 'error', 'error'],
    ['span:status', '"ok"', 'ok'],
    ['kind', '"server"', 'server'],
    ['span:kind', 'client', 'client'],
    ['span.foo', '"123"', '"123"'],
    ['span.foo', '"true"', '"true"'],
    ['span.foo', '""', '""'],
    ['span.network.protocol.version', '123', '"123"'],
    ['duration', '100ms', '100ms'],
    ['span.foo', JSON.stringify('say "hi"\\there\n\t\r'), JSON.stringify('say "hi"\\there\n\t\r')],
  ])('preserves the typed tile predicate %s=%s', (attribute, rawValue, expectedValue) => {
    const frame: DataFrame = {
      ...frameWithServiceLabel,
      fields: [{ ...frameWithServiceLabel.fields[0], labels: { [attribute]: rawValue } }],
    };

    expect(generateMetricsQueryForBreakdownTile('rate', attribute, frame)).toBe(
      `{\${primarySignal} && \${filters} && ${attribute}=${expectedValue}} | rate() by(${attribute})`
    );
  });

  it.each([
    ['span.foo', '123'],
    ['span.foo', 'true'],
    ['span.foo', 'error'],
    ['span.foo', 'checkout'],
    ['span.foo', '"unterminated'],
    ['span.foo', '"bad\\q"'],
    ['span.foo', '"${service}"'],
    ['status', '"server"'],
    ['status', 'unknown'],
    ['kind', '"error"'],
    ['duration', '123'],
    ['duration', 'not-a-duration'],
  ])('excludes an ambiguous or unsafe tile predicate %s=%s', (attribute, rawValue) => {
    const frame: DataFrame = {
      ...frameWithServiceLabel,
      fields: [{ ...frameWithServiceLabel.fields[0], labels: { [attribute]: rawValue } }],
    };

    expect(generateMetricsQueryForBreakdownTile('rate', attribute, frame)).toBeUndefined();
  });

  it('excludes a tile with missing label metadata rather than substituting No labels', () => {
    expect(generateMetricsQueryForBreakdownTile('rate', 'span.missing', frameWithServiceLabel)).toBeUndefined();
  });
});

describe('getMetricsTempoQuery', () => {
  it('should return correct configuration for rate metric', () => {
    const result = getMetricsTempoQuery({ metric: 'rate' });
    expect(result).toEqual({
      refId: 'A',
      query: '{${primarySignal} && ${filters}} | rate() ',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });

  it('should return correct configuration for errors metric', () => {
    const result = getMetricsTempoQuery({ metric: 'errors' });
    expect(result).toEqual({
      refId: 'A',
      query: '{${primarySignal} && ${filters} && status=error} | rate() ',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });

  it('should return correct configuration for duration metric', () => {
    const result = getMetricsTempoQuery({ metric: 'duration' });
    expect(result).toEqual({
      refId: 'A',
      query: '{${primarySignal} && ${filters}} | quantile_over_time(duration, ${durationPercentiles:csv}) ',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });

  it('should include tagKey in the query when provided', () => {
    const result = getMetricsTempoQuery({ metric: 'rate', groupByKey: 'serviceName' });
    expect(result).toEqual({
      refId: 'A',
      query: '{${primarySignal} && ${filters} && serviceName != nil} | rate() by(serviceName)',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });
});
