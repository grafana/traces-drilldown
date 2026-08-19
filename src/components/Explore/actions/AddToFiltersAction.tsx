import React from 'react';

import { DataFrame, GrafanaTheme2 } from '@grafana/data';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, AdHocFiltersVariable } from '@grafana/scenes';
import { t, Trans } from '@grafana/i18n';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getFiltersVariable, getLabelValue, getLabelValueType, getRawLabelValue } from '../../../utils/utils';
import { DATABASE_CALLS_KEY } from 'pages/Explore/primary-signals';
import { useFlagUseValueTypeFiltering } from 'featureFlags/featureFlags';
import { AdHocFilterWithValueType } from 'utils/shared';

interface AddToFiltersActionState extends SceneObjectState {
  frame: DataFrame;
  onClick: (payload: any) => void;
  labelKey?: string;
}

export class AddToFiltersAction extends SceneObjectBase<AddToFiltersActionState> {
  private handleFilterAction = (operator: '=' | '!=') => {
    const variable = getFiltersVariable(this);

    const labels = this.state.frame.fields.find((f) => f.labels)?.labels ?? {};
    if (this.state.labelKey) {
      if (!labels[this.state.labelKey]) {
        return;
      }
    } else {
      if (Object.keys(labels).length !== 1) {
        return;
      }
    }

    const labelName = this.state.labelKey ?? Object.keys(labels)[0];
    const value = getLabelValue(this.state.frame, this.state.labelKey);

    addToFilters(variable, labelName, value, operator);

    this.state.onClick({ labelName });
  };

  public onIncludeClick = () => {
    this.handleFilterAction('=');
  };

  public onExcludeClick = () => {
    this.handleFilterAction('!=');
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersAction>) => {
    const styles = useStyles2(getStyles);
    const useValueFiltering = useFlagUseValueTypeFiltering();

    return (
      <div className={styles.group} role="group" aria-label={t('add-to-filters-action.aria-label', 'Add to filters')}>
        <button
          type="button"
          className={styles.segment}
          onClick={() => {
            if (!useValueFiltering) {
              model.onIncludeClick();
              return;
            }
            model.newOnIncludeClick();
          }}
        >
          <Trans i18nKey="add-to-filters-action.include">Include</Trans>
        </button>
        <button
          type="button"
          className={styles.segment}
          onClick={() => {
            if (!useValueFiltering) {
              model.onExcludeClick();
              return;
            }
            model.newOnExcludeClick();
          }}
        >
          <Trans i18nKey="add-to-filters-action.exclude">Exclude</Trans>
        </button>
      </div>
    );
  };

  public newOnIncludeClick = () => {
    this.newHandleFilterAction('=');
  };

  public newOnExcludeClick = () => {
    this.newHandleFilterAction('!=');
  };

  private newHandleFilterAction = (operator: '=' | '!=') => {
    const variable = getFiltersVariable(this);

    const labels = this.state.frame.fields.find((f) => f.labels)?.labels ?? {};
    if (this.state.labelKey && !labels[this.state.labelKey]) {
      console.warn(
        `TracesDrilldown: There were no labels matching ${this.state.labelKey}, ${operator === '=' ? 'include' : 'exclude'} click ignored`
      );
      return;
    }

    if (!this.state.labelKey && Object.keys(labels).length !== 1) {
      console.warn(
        `TracesDrilldown: We coulndn't find the label in the data response, ${operator === '=' ? 'include' : 'exclude'} click ignored`
      );
      return;
    }

    const labelName = this.state.labelKey ?? Object.keys(labels)[0];
    const rawValue = getRawLabelValue(this.state.frame, this.state.labelKey);
    if (rawValue === null) {
      console.warn(
        `TracesDrilldown: No value found for ${labelName}, ${operator === '=' ? 'include' : 'exclude'} click ignored`
      );
      return;
    }

    const valueType = getLabelValueType(rawValue, labelName);
    const value = rawValue.replace(/"/g, '');
    const filter = { key: labelName, value, operator, meta: { valueType } };

    newAddToFilters(variable, filter);

    this.state.onClick({ labelName });
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    group: css({
      display: 'inline-flex',
      alignItems: 'stretch',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      padding: 0,
      gap: theme.spacing(1.5),
      overflow: 'hidden',
    }),
    segment: css({
      ...theme.typography.bodySmall,
      fontWeight: theme.typography.fontWeightBold,
      lineHeight: 1.2,
      color: theme.colors.text.primary,
      background: 'transparent',
      border: 'none',
      margin: 0,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      alignSelf: 'stretch',
      padding: theme.spacing(0.5, 1),
      '&:hover': {
        backgroundColor: theme.colors.background.secondary,
      },
      '&:focus-visible': {
        outline: 'none',
        boxShadow: `inset 0 0 0 2px ${theme.colors.primary.border}`,
      },
    }),
  };
}

export const addToFilters = (
  variable: AdHocFiltersVariable,
  label: string,
  value: string,
  operator: '=' | '!=' | '=~' | '!~' = '=',
  append = false
) => {
  // TODO: Replace it with new API introduced in https://github.com/grafana/scenes/issues/1103
  // At the moment AdHocFiltersVariable doesn't support pushing new history entry on change
  history.pushState(null, '');

  let baseFilters;
  if (append) {
    baseFilters = variable.state.filters;
  } else {
    baseFilters = variable.state.filters.filter((f) => f.key === DATABASE_CALLS_KEY || f.key !== label);
  }

  variable.setState({
    filters: [
      ...baseFilters,
      {
        key: label,
        operator: operator,
        value: value,
      },
    ],
  });
};

export const newAddToFilters = (variable: AdHocFiltersVariable, filter: AdHocFilterWithValueType, append = false) => {
  // TODO: Replace it with new API introduced in https://github.com/grafana/scenes/issues/1103
  // At the moment AdHocFiltersVariable doesn't support pushing new history entry on change
  history.pushState(null, '');

  let baseFilters;
  if (append) {
    baseFilters = variable.state.filters;
  } else {
    baseFilters = variable.state.filters.filter((f) => f.key === DATABASE_CALLS_KEY || f.key !== filter.key);
  }

  variable.setState({
    filters: [...baseFilters, { ...filter }],
  });
};
