import { VariableValue } from '@grafana/scenes';
import { getTestIdFromAttribute, getTestIdFromMetric, testIds } from './testIds';
import { AttributeItem } from '../types';

describe('getTestIdFromMetric', () => {
  it('should return correct testid for rate metric', () => {
    const metric: VariableValue = 'rate';
    expect(getTestIdFromMetric(metric)).toEqual(testIds.ratePanel);
  });

  it('should return correct testid for errors metric', () => {
    const metric: VariableValue = 'errors';
    expect(getTestIdFromMetric(metric)).toEqual(testIds.errorsPanel);
  });

  it('should return correct testid for duration metric', () => {
    const metric: VariableValue = 'duration';
    expect(getTestIdFromMetric(metric)).toEqual(testIds.durationPanel);
  });

  it('should return correct testid for unknown metric', () => {
    const metric: VariableValue = 'log';
    expect(getTestIdFromMetric(metric)).toEqual('unknown-panel');
  });

  it('should return correct testid for no metric', () => {
    expect(getTestIdFromMetric('')).toEqual('unknown-panel');
  });
});

describe('getTestIdFromAttribute', () => {
  it('should return correct testid for attribute', () => {
    const attribute: AttributeItem = { label: 'name', scope: 'Span', value: 'name' };
    expect(getTestIdFromAttribute(attribute)).toEqual('grafana-exploretraces-app name-attribute-item');
  });

  it('should return correct testid for attribute without value', () => {
    const attribute: AttributeItem = { label: 'name', scope: 'Span', value: '' };
    expect(getTestIdFromAttribute(attribute)).toEqual('grafana-exploretraces-app unknown-attribute-item');
  });

  it('should return correct testid for undefined attribute', () => {
    const attribute = undefined as unknown as AttributeItem;
    expect(getTestIdFromAttribute(attribute)).toEqual('grafana-exploretraces-app unknown-attribute-item');
  });
});
