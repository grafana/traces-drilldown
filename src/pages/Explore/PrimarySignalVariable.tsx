import React from 'react';
import { CustomVariable, MultiValueVariable, MultiValueVariableState, SceneComponentProps } from '@grafana/scenes';
import { primarySignalOptions } from './primary-signals';
import { RadioButtonGroup, Select } from '@grafana/ui';
import { useMount } from 'react-use';
import { css } from '@emotion/css';

export class PrimarySignalVariable extends CustomVariable {
  static Component = ({ model }: SceneComponentProps<MultiValueVariable<MultiValueVariableState>>) => {
    const { value, isReadOnly } = model.useState();

    // ensure the variable is set to the default value
    useMount(() => {
      if (!value) {
        model.changeValueTo(isReadOnly ? primarySignalOptions[1].value! : primarySignalOptions[0].value!);
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

    if (isReadOnly) {
      return <></>;
    }

    return (
      <>
        <RadioButtonGroup
          options={buttonGroupOptions}
          value={value as string}
          onChange={(v: string) => model.changeValueTo(v!, undefined, true)}
          disabled={isReadOnly}
          className={styles.buttonGroup}
        />
        <Select
          options={selectOptions}
          value={''}
          placeholder=""
          width={4}
          onChange={(v) => model.changeValueTo(v.value!, undefined, true)}
          className={styles.select}
          components={{
            IndicatorSeparator: () => null,
            SingleValue: () => null,
          }}
        />
      </>
    );
  };
}

const styles = {
  select: css`
    [class$='input-suffix'] {
      position: absolute;
      z-index: 2;
    }

    :focus-within {
      outline: none;
      box-shadow: none;
    }

    > div {
      padding: 0;
    }

    input {
      opacity: 0 !important;
    }

    border-radius: 0 2px 2px 0;
    border-left: none;
  `,
  buttonGroup: css`
    border-radius: 2px 0 0 2px;
  `,
};
