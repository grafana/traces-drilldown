import React, { useEffect } from 'react';
import { CustomVariable, MultiValueVariable, MultiValueVariableState, SceneComponentProps } from '@grafana/scenes';
import { primarySignalOptions } from './primary-signals';
import { Icon, RadioButtonGroup, Select } from '@grafana/ui';
import { css } from '@emotion/css';
import { components, DropdownIndicatorProps } from 'react-select';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';

const CustomMenu = (props: any) => {
  return <components.Menu {...props} className={styles.customMenu} />;
};

export function DropdownIndicator({ selectProps }: DropdownIndicatorProps) {
  const isOpen = selectProps.menuIsOpen;
  const icon = isOpen ? 'angle-up' : 'angle-down';
  const size = 'md';
  return <Icon name={icon} size={size} />;
}

export class PrimarySignalVariable extends CustomVariable {
  static Component = ({ model }: SceneComponentProps<MultiValueVariable<MultiValueVariableState>>) => {
    const { value, isReadOnly } = model.useState();

    // ensure the variable is set to the default value
    useEffect(() => {
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

    const onChange = (v: string) => {
      reportAppInteraction(
        USER_EVENTS_PAGES.analyse_traces,
        USER_EVENTS_ACTIONS.analyse_traces.primary_signal_changed,
        {
          primary_signal: v,
        }
      );
      model.changeValueTo(v!, undefined, true);
    };

    if (isReadOnly) {
      return <></>;
    }

    return (
      <>
        <RadioButtonGroup
          options={buttonGroupOptions}
          value={value as string}
          onChange={onChange}
          disabled={isReadOnly}
          className={styles.buttonGroup}
        />
        <Select
          options={[{ label: 'Primary signal', options: selectOptions }]}
          value={''}
          placeholder=""
          isSearchable={false}
          isClearable={false}
          width={4}
          onChange={(v) => onChange(v.value!)}
          className={styles.select}
          components={{
            IndicatorSeparator: () => null,
            SingleValue: () => null,
            Menu: CustomMenu,
            DropdownIndicator,
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
  customMenu: css`
    width: 230px;

    [class$='grafana-select-option-grafana-select-option-focused'] {
      background: transparent;

      ::before {
        display: none;
      }
    }
  `,
};
