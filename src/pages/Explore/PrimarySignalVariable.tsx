import React from 'react';
import { CustomVariable, MultiValueVariable, MultiValueVariableState, SceneComponentProps } from '@grafana/scenes';
import { primarySignalOptions } from './primary-signals';
import { RadioButtonGroup, Select } from '@grafana/ui';
import { useMount } from 'react-use';
import { css } from '@emotion/css';

export class PrimarySignalVariable extends CustomVariable {
  static Component = ({ model }: SceneComponentProps<MultiValueVariable<MultiValueVariableState>>) => {
    const { value } = model.useState();

    // ensure the variable is set to the default value
    useMount(() => {
      if (!value) {
        model.changeValueTo(primarySignalOptions[0].value!);
      }
    });

    const buttonGroupOptions = primarySignalOptions.slice(0, 2);
    const currentSignal = primarySignalOptions.find((option) => option.value === value);
    if (currentSignal && !buttonGroupOptions.some((option) => option.filter.key === currentSignal.filter.key)) {
      buttonGroupOptions.push(currentSignal);
    }
    const selectOptions = primarySignalOptions.filter(
      (option) => !buttonGroupOptions.some((b) => b.value === option.value)
    );

    return (
      <>
        <RadioButtonGroup
          options={buttonGroupOptions}
          value={value as string}
          onChange={(v: string) => model.changeValueTo(v!, undefined, true)}
          className={styles.buttonGroup}
        />
        <Select
          options={selectOptions}
          value={value as string}
          placeholder=""
          width={4}
          onChange={(v) => model.changeValueTo(v.value!, undefined, true)}
          className={styles.select}
        />
      </>
    );
  };
}

const styles = {
  select: css`
    // [class$='grafana-select-value-container'] {
    //   display: none;
    // }

    > div {
      padding: 0;
    }

    border-radius: 0 2px 2px 0;
    border-left: none;
  `,
  buttonGroup: css`
    border-radius: 2px 0 0 2px;
  `,
};
