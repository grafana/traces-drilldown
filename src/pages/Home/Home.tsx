import { css } from '@emotion/css';
import React from 'react';
// eslint-disable-next-line no-restricted-imports
import { duration } from 'moment';

import { AdHocVariableFilter, GrafanaTheme2 } from '@grafana/data';
import {
  AdHocFiltersVariable,
  DataSourceVariable,
  SceneComponentProps,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneTimeRangeLike,
  SceneVariableSet,
} from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import {
  DATASOURCE_LS_KEY,
  explorationDS,
  HOMEPAGE_FILTERS_LS_KEY,
  VAR_DATASOURCE,
  VAR_HOME_FILTER,
} from '../../utils/shared';
import { AttributePanel } from 'components/Home/AttributePanel';
import { HeaderScene } from 'components/Home/HeaderScene';
import { getDatasourceVariable, getHomeFilterVariable } from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_PAGES, USER_EVENTS_ACTIONS } from 'utils/analytics';
import { getTagKeysProvider, renderTraceQLLabelFilters } from './utils';

export interface HomeState extends SceneObjectState {
  controls?: SceneObject[];
  initialDS?: string;
  initialFilters: AdHocVariableFilter[];
  body?: SceneCSSGridLayout;
}

export class Home extends SceneObjectBase<HomeState> {
  public constructor(state: HomeState) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialFilters, state.initialDS),
      controls: state.controls ?? [new SceneTimePicker({}), new SceneRefreshPicker({})],
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const sceneTimeRange = sceneGraph.getTimeRange(this);
    const filterVariable = getHomeFilterVariable(this);
    filterVariable.setState({
      getTagKeysProvider: getTagKeysProvider,
    });

    getDatasourceVariable(this).subscribeToState((newState) => {
      if (newState.value) {
        localStorage.setItem(DATASOURCE_LS_KEY, newState.value.toString());
      }
    });

    getHomeFilterVariable(this).subscribeToState((newState, prevState) => {
      if (newState.filters !== prevState.filters) {
        this.buildPanels(sceneTimeRange, newState.filters);

        // save the filters to local storage
        localStorage.setItem(HOMEPAGE_FILTERS_LS_KEY, JSON.stringify(newState.filters));

        const newFilters = newState.filters.filter((f) => !prevState.filters.find((pf) => pf.key === f.key));
        if (newFilters.length > 0) {
          reportAppInteraction(USER_EVENTS_PAGES.home, USER_EVENTS_ACTIONS.home.filter_changed, {
            key: newFilters[0].key,
          });
        }
      }
    });

    sceneTimeRange.subscribeToState((newState, prevState) => {
      if (newState.value.from !== prevState.value.from || newState.value.to !== prevState.value.to) {
        this.buildPanels(sceneTimeRange, filterVariable.state.filters);
      }
    });
    this.buildPanels(sceneTimeRange, filterVariable.state.filters);
  }

  buildPanels(sceneTimeRange: SceneTimeRangeLike, filters: AdHocVariableFilter[]) {
    const from = sceneTimeRange.state.value.from.unix();
    const to = sceneTimeRange.state.value.to.unix();
    const dur = duration(to - from, 's');
    const durString = `${dur.asSeconds()}s`;
    const renderedFilters = renderTraceQLLabelFilters(filters);

    this.setState({
      body: new SceneCSSGridLayout({
        children: [
          new SceneCSSGridLayout({
            autoRows: 'min-content',
            columnGap: 2,
            rowGap: 2,
            children: [
              new SceneCSSGridItem({
                body: new AttributePanel({
                  query: {
                    query: `{nestedSetParent < 0 && status = error ${renderedFilters}} | count_over_time() by (resource.service.name)`,
                    step: durString,
                  },
                  title: 'Errored services',
                  type: 'errored-services',
                }),
              }),
              new SceneCSSGridItem({
                body: new AttributePanel({
                  query: {
                    query: `{nestedSetParent < 0 ${renderedFilters}} | quantile_over_time(duration, 0.9) by (resource.service.name)`,
                    step: durString,
                  },
                  title: 'Slow services',
                  type: 'slowest-services',
                }),
              }),
              new SceneCSSGridItem({
                body: new AttributePanel({
                  query: {
                    query: `{nestedSetParent<0 ${renderedFilters}} | histogram_over_time(duration)`,
                  },
                  title: 'Slow traces',
                  type: 'slowest-traces',
                  filter: renderedFilters,
                }),
              }),
            ],
          }),
        ],
      }),
    });
  }

  static Component = ({ model }: SceneComponentProps<Home>) => {
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <HeaderScene.Component model={model} />
        {body && <body.Component model={body} />}
      </div>
    );
  };
}

function getVariableSet(initialFilters: AdHocVariableFilter[], initialDS?: string) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: 'Data source',
        value: initialDS,
        pluginId: 'tempo',
      }),
      new AdHocFiltersVariable({
        name: VAR_HOME_FILTER,
        datasource: explorationDS,
        layout: 'combobox',
        filters: initialFilters,
        allowCustomValue: true,
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      margin: `${theme.spacing(4)} auto`,
      width: '75%',

      '@media (max-width: 900px)': {
        width: '95%',
      },
    }),
  };
}
