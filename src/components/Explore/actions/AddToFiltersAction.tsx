import React from 'react';

import { DataFrame } from '@grafana/data';
import { SceneObjectState, SceneObjectBase, SceneComponentProps, AdHocFiltersVariable } from '@grafana/scenes';
import { Button } from '@grafana/ui';
import { getFiltersVariable, getLabelValue } from '../../../utils/utils';
import { DATABASE_CALLS_KEY } from 'pages/Explore/primary-signals';

export interface AddToFiltersActionState extends SceneObjectState {
  frame: DataFrame;
  onClick: (payload: any) => void;
  labelKey?: string;
}

export class AddToFiltersAction extends SceneObjectBase<AddToFiltersActionState> {
  public onClick = () => {
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

    addToFilters(variable, labelName, value);

    this.state.onClick({ labelName });
  };

  public static Component = ({ model }: SceneComponentProps<AddToFiltersAction>) => {
    const key = model.state?.labelKey ?? '';
    const field = model.state?.frame.fields.filter((x) => x.type !== 'time');
    const value = field?.[0]?.labels?.[key] ?? '';
    const filterExists = filterExistsForKey(getFiltersVariable(model), key, value.replace(/"/g, ''));

    if (!filterExists) {
      return (
        <Button variant="primary" size="sm" fill="text" onClick={model.onClick} icon={'search-plus'}>
          Add to filters
        </Button>
      );
    }
    return <></>;
  };
}

export const addToFilters = (variable: AdHocFiltersVariable, label: string, value: string) => {
  // ensure we set the new filter with latest value
  // and remove any existing filter for the same key
  // and also keep span.db.name as it is a primary filter
  const filtersWithoutNew = variable.state.filters.filter((f) => f.key === DATABASE_CALLS_KEY || f.key !== label);

  variable.setState({
    filters: [
      ...filtersWithoutNew,
      {
        key: label,
        operator: '=',
        value: value,
      },
    ],
  });
};

export const filterExistsForKey = (model: AdHocFiltersVariable, key: string, value: string) => {
  const variable = getFiltersVariable(model);
  return variable.state.filters.find((f) => f.key === key && f.value === value);
};
