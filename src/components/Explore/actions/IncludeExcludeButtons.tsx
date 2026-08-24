import React from 'react';

import { t, Trans } from '@grafana/i18n';
import { Button, Stack } from '@grafana/ui';

export interface IncludeExcludeButtonsProps {
  onInclude: (event: React.MouseEvent) => void;
  onExclude: (event: React.MouseEvent) => void;
  showInclude?: boolean;
  showExclude?: boolean;
  includeAriaLabel?: string;
  excludeAriaLabel?: string;
}

export function IncludeExcludeButtons({
  onInclude,
  onExclude,
  showInclude = true,
  showExclude = true,
  includeAriaLabel = t('add-to-filters-action.include', 'Include'),
  excludeAriaLabel = t('add-to-filters-action.exclude', 'Exclude'),
}: IncludeExcludeButtonsProps) {
  if (!showInclude && !showExclude) {
    return null;
  }

  return (
    <Stack gap={0.5}>
      {showInclude && (
        <Button size="sm" variant="secondary" onClick={onInclude} aria-label={includeAriaLabel}>
          <Trans i18nKey="add-to-filters-action.include">Include</Trans>
        </Button>
      )}
      {showExclude && (
        <Button size="sm" variant="secondary" onClick={onExclude} aria-label={excludeAriaLabel}>
          <Trans i18nKey="add-to-filters-action.exclude">Exclude</Trans>
        </Button>
      )}
    </Stack>
  );
}
