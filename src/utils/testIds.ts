import { VariableValue } from '@grafana/scenes';

export const testIds = {
  emptyState: 'data-testid empty-state',
  errorState: 'data-testid error-state',
  loadingState: 'data-testid loading-state',
  ratePanel: `data-testid rate-panel`,
  errorsPanel: `data-testid errors-panel`,
  durationPanel: `data-testid duration-panel`,
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
