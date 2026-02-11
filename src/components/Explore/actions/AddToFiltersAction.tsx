import React from 'react';

import { DataFrame } from '@grafana/data';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, AdHocFiltersVariable } from '@grafana/scenes';
import { Button } from '@grafana/ui';
import { getFiltersVariable, getLabelValue } from '../../../utils/utils';
import { DATABASE_CALLS_KEY } from 'pages/Explore/primary-signals';

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
    return (
      <>
        <Button variant="primary" size="sm" fill="text" onClick={model.onIncludeClick}>
          Include
        </Button>
        <Button variant="primary" size="sm" fill="text" onClick={model.onExcludeClick}>
          Exclude
        </Button>
      </>
    );
  };
}

export const addToFilters = (variable: AdHocFiltersVariable, label: string, value: string, operator: '=' | '!=' = '=', append = false) => {
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

export const filterExistsForKey = (model: AdHocFiltersVariable, key: string, value: string) => {
  const variable = getFiltersVariable(model);
  return variable.state.filters.find((f) => f.key === key && f.value === value);
};
