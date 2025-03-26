import { generateMetricsQuery, metricByWithStatus } from './generateMetricsQuery';
import { ALL } from '../../../utils/shared';

describe('generateMetricsQuery', () => {
  it('should generate a basic rate query', () => {
    const result = generateMetricsQuery({ metric: 'rate' });
    expect(result).toEqual('${primarySignal} && ${filters} && status!=error | rate() ');
  });

  it('should generate an errors query', () => {
    const result = generateMetricsQuery({ metric: 'errors' });
    expect(result).toEqual('${primarySignal} && ${filters} && status=error | rate() ');
  });

  it('should generate a duration query', () => {
    const result = generateMetricsQuery({ metric: 'duration' });
    expect(result).toEqual('${primarySignal} && ${filters} | quantile_over_time(duration, 0.9) ');
  });

  it('should add extra filters if provided', () => {
    const result = generateMetricsQuery({ 
      metric: 'rate', 
      extraFilters: 'name="test"' 
    });
    expect(result).toEqual('${primarySignal} && ${filters} && status!=error && name="test" | rate() ');
  });

  it('should handle groupByKey when provided', () => {
    const result = generateMetricsQuery({ 
      metric: 'rate', 
      groupByKey: 'serviceName' 
    });
    expect(result).toEqual('${primarySignal} && ${filters} && status!=error && serviceName != nil | rate() by(serviceName)');
  });

  it('should not add groupByKey filter when groupByKey is ALL', () => {
    const result = generateMetricsQuery({ 
      metric: 'rate', 
      groupByKey: ALL 
    });
    expect(result).toEqual('${primarySignal} && ${filters} && status!=error | rate() ');
  });

  it('should add status to groupBy when groupByStatus is true', () => {
    const result = generateMetricsQuery({ 
      metric: 'rate', 
      groupByStatus: true 
    });
    expect(result).toEqual('${primarySignal} && ${filters} && status!=error | rate() by(status)');
  });

  it('should add both groupByKey and status to groupBy when both are provided', () => {
    const result = generateMetricsQuery({ 
      metric: 'rate', 
      groupByKey: 'serviceName',
      groupByStatus: true 
    });
    expect(result).toEqual('${primarySignal} && ${filters} && status!=error && serviceName != nil | rate() by(serviceName, status)');
  });

  it('should not add status to groupBy for duration metric even if groupByStatus is true', () => {
    const result = generateMetricsQuery({ 
      metric: 'duration', 
      groupByKey: 'serviceName',
      groupByStatus: true 
    });
    expect(result).toEqual('${primarySignal} && ${filters} && serviceName != nil | quantile_over_time(duration, 0.9) by(serviceName)');
  });
});

describe('metricByWithStatus', () => {
  it('should return correct configuration for rate metric', () => {
    const result = metricByWithStatus('rate');
    expect(result).toEqual({
      refId: 'A',
      query: '${primarySignal} && ${filters} && status!=error | rate() by(status)',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });

  it('should return correct configuration for errors metric', () => {
    const result = metricByWithStatus('errors');
    expect(result).toEqual({
      refId: 'A',
      query: '${primarySignal} && ${filters} && status=error | rate() by(status)',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });

  it('should return correct configuration for duration metric', () => {
    const result = metricByWithStatus('duration');
    expect(result).toEqual({
      refId: 'A',
      query: '${primarySignal} && ${filters} | quantile_over_time(duration, 0.9) by()',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });

  it('should include tagKey in the query when provided', () => {
    const result = metricByWithStatus('rate', 'serviceName');
    expect(result).toEqual({
      refId: 'A',
      query: '${primarySignal} && ${filters} && status!=error && serviceName != nil | rate() by(serviceName, status)',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });
}); 
