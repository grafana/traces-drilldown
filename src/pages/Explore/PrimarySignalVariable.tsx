import React from 'react';
import { CustomVariable, MultiValueVariable, MultiValueVariableState, SceneComponentProps } from '@grafana/scenes';
import { primarySignalOptions } from './primary-signals';
import { RadioButtonGroup } from '@grafana/ui';
import { useMount } from 'react-use';

export class PrimarySignalVariable extends CustomVariable {
  static Component = ({ model }: SceneComponentProps<MultiValueVariable<MultiValueVariableState>>) => {
    const { value } = model.useState();

    // ensure the variable is set to the default value
    useMount(() => {
      if (!value) {
        model.changeValueTo(primarySignalOptions[0].value!);
      }
    });

    return (
      <RadioButtonGroup
        options={primarySignalOptions}
        value={value as string}
        onChange={(v: string) => model.changeValueTo(v!, undefined, true)}
      />
    );
  };
}
