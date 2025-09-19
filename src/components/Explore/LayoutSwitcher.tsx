import React from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { SceneComponentProps, SceneObject, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Label, RadioButtonGroup, Stack, useStyles2 } from '@grafana/ui';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';
import { css } from '@emotion/css';

export interface LayoutSwitcherState extends SceneObjectState {
  active: LayoutType;
  layouts: SceneObject[];
  options: Array<SelectableValue<LayoutType>>;
}

export type LayoutType = 'single' | 'grid' | 'rows';

export class LayoutSwitcher extends SceneObjectBase<LayoutSwitcherState> {
  public Selector({ model }: { model: LayoutSwitcher }) {
    const { active, options } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <Stack>
        <Label className={styles.label}>View</Label>
        <RadioButtonGroup options={options} value={active} onChange={model.onLayoutChange} />
      </Stack>
    );
  }

  public onLayoutChange = (active: LayoutType) => {
    this.setState({ active });
    reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.layout_type_changed, {
      layout: active,
    });
  };

  public static Component = ({ model }: SceneComponentProps<LayoutSwitcher>) => {
    const { layouts, options, active } = model.useState();

    const index = options.findIndex((o) => o.value === active);
    if (index === -1) {
      return null;
    }

    const layout = layouts[index];

    return <layout.Component model={layout} />;
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    label: css({
      marginBottom: theme.spacing(0),
      display: 'flex',
      alignItems: 'center',
    }),
  };
}
