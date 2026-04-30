import React from 'react';
import { css } from '@emotion/css';
import { AdHocVariableFilter } from '@grafana/data';
import { AdHocFiltersVariable, SceneComponentProps } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';
import { VariableHide } from '@grafana/schema';

import { renderTraceQLAdHocFilters } from 'utils/filters-renderer';
import { VAR_OR_FILTERS, explorationDS } from 'utils/shared';

const AdHocFiltersVariableComponent = AdHocFiltersVariable.Component as React.ComponentType<
  SceneComponentProps<AdHocFiltersVariable>
>;

/**
 * Read-only combobox row for `initialOrFilters` (same UI as {@link AttributeFiltersVariable}).
 * Uses `applyMode: 'manual'` so it does not patch Tempo queries; TraceQL still comes from the `filtersOrPrefix` custom variable (`VAR_FILTERS_OR_PREFIX`).
 */
export class InitialOrFiltersVariable extends AdHocFiltersVariable {
  static Component = (props: SceneComponentProps<InitialOrFiltersVariable>) => {
    const styles = useStyles2(getStyles);
    return (
      <div className={styles.container}>
        <AdHocFiltersVariableComponent {...props} model={props.model} />
      </div>
    );
  };

  constructor(initialOrFilters: AdHocVariableFilter[]) {
    const filters = initialOrFilters
      .filter((f) => f.key && f.operator && f.value)
      .map((f) => ({ ...f, readOnly: true }));

    super({
      name: VAR_OR_FILTERS,
      datasource: explorationDS,
      hide: VariableHide.hideLabel,
      layout: 'combobox',
      filters,
      readOnly: true,
      applyMode: 'manual',
      allowCustomValue: false,
      expressionBuilder: (filters) => renderTraceQLAdHocFilters(filters, '||'),
    });
  }
}

function getStyles() {
  return {
    container: css({
      label: 'initial-or-filters-container',
      // AdHocFiltersComboboxRenderer: last direct child of the combobox root is `rightControls` (clear-all ×).
      '& > div > div:last-child': {
        display: 'none',
      },
    }),
  };
}
