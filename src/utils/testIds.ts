import { VariableValue } from '@grafana/scenes';
import { AttributeItem } from '../types';

export const testIds = {
  emptyState: 'data-testid empty-state',
  errorState: 'data-testid error-state',
  loadingState: 'data-testid loading-state',
  ratePanel: `data-testid rate-panel`,
  errorsPanel: `data-testid errors-panel`,
  durationPanel: `data-testid duration-panel`,
  breakdownContainer: `data-testid breakdown container`,
  serviceStructureContainer: `data-testid service structure container`,
  comparisonContainer: `data-testid comparison container`,
  tracesContainer: `data-testid traces container`,
};

export function getTestIdFromMetric(metric: VariableValue | string): string {
  const value = String(metric);
  switch (value) {
    case 'rate':
      return testIds.ratePanel;
    case 'errors':
      return testIds.errorsPanel;
    case 'duration':
      return testIds.durationPanel;
  }

  return 'data-testid unknown-panel';
}

export function getTestIdFromAttribute(attribute: AttributeItem): string {
  if (!attribute?.value) {
    return 'data-testid unknown-attribute-item';
  }
  return `data-testid ${attribute.value}-attribute-item`;
}
