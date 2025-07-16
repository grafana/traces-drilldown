import { generateMetricsQuery, metricByWithStatus } from './generateMetricsQuery';
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
    expect(result).toEqual('{${primarySignal} && ${filters}} | quantile_over_time(duration, 0.9) ');
  });

  it('should add extra filters if provided', () => {
    const result = generateMetricsQuery({ 
      metric: 'rate', 
      extraFilters: 'name="test"' 
    });
    expect(result).toEqual('{${primarySignal} && ${filters} && name="test"} | rate() ');
  });

  it('should handle groupByKey when provided', () => {
    const result = generateMetricsQuery({ 
      metric: 'rate', 
      groupByKey: 'serviceName' 
    });
    expect(result).toEqual('{${primarySignal} && ${filters} && serviceName != nil} | rate() by(serviceName)');
  });

  it('should not add groupByKey filter when groupByKey is ALL', () => {
    const result = generateMetricsQuery({ 
      metric: 'rate', 
      groupByKey: ALL 
    });
    expect(result).toEqual('{${primarySignal} && ${filters}} | rate() ');
  });
});

describe('metricByWithStatus', () => {
  it('should return correct configuration for rate metric', () => {
    const result = metricByWithStatus('rate');
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
    const result = metricByWithStatus('errors');
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
    const result = metricByWithStatus('duration');
    expect(result).toEqual({
      refId: 'A',
      query: '{${primarySignal} && ${filters}} | quantile_over_time(duration, 0.9) ',
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
      query: '{${primarySignal} && ${filters} && serviceName != nil} | rate() by(serviceName)',
      queryType: 'traceql',
      tableType: 'spans',
      limit: 100,
      spss: 10,
      filters: [],
    });
  });
}); 
