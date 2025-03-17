import { TimeRange, FieldConfigSource, FieldConfig } from '@grafana/data';
import { sceneGraph, SceneObject, SceneObjectBase, SceneObjectState, SceneQueryRunner, VizPanel } from '@grafana/scenes';
import { DataQuery, DataSourceRef } from '@grafana/schema';

import Logo from '../../../../src/img/logo.svg';
import { VAR_DATASOURCE_EXPR } from 'utils/shared';
import { findObjectOfType } from 'utils/utils';

export interface AddToInvestigationButtonState extends SceneObjectState {
  dsUid?: string;
  query?: string;
  labelValue?: string;
  context?: ExtensionContext;
  queries: DataQuery[];
  fieldConfig?: FieldConfigSource;
}

interface ExtensionContext {
  timeRange: TimeRange;
  queries: DataQuery[];
  datasource: DataSourceRef;
  origin: string;
  url: string;
  type: string;
  title: string;
  id: string;
  logoPath: string;
}

export class AddToInvestigationButton extends SceneObjectBase<AddToInvestigationButtonState> {
  constructor(state: Omit<AddToInvestigationButtonState, 'queries'>) {
    super({ ...state, queries: [] });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate = () => {
    this._subs.add(
      this.subscribeToState(() => {
        this.getQueries();
        this.getContext();
      })
    );

    const datasourceUid = sceneGraph.interpolate(this, VAR_DATASOURCE_EXPR);
    this.setState({ dsUid: datasourceUid });
  };

  private readonly getQueries = () => {
    const data = sceneGraph.getData(this);
    const queryRunner = sceneGraph.findObject(data, isQueryRunner);

    if (isQueryRunner(queryRunner)) {
      const queries = queryRunner.state.queries.map((q) => ({
        ...q,
        query: this.state.query,
      }));

      if (JSON.stringify(queries) !== JSON.stringify(this.state.queries)) {
        this.setState({ queries });
      }
    }
  };

  private readonly getFieldConfig = () => {
    const panel = findObjectOfType(this, (o) => o instanceof VizPanel, VizPanel);
    const data = sceneGraph.getData(this);
    const frames = data?.state.data?.series;
    let fieldConfig = panel?.state.fieldConfig;
    if (fieldConfig) {
      if (frames) {
        for (const frame of frames) {
          for (const field of frame.fields) {
            const configKeys = Object.keys(field.config);
            const properties = configKeys.map((key) => ({
              id: key,
              value: field.config[key as keyof FieldConfig],
            }));

            // check if the override already exists
            const existingOverride = fieldConfig.overrides.find(
              (o) => o.matcher.options === (field.config.displayNameFromDS ?? field.config.displayName ?? field.name) && o.matcher.id === 'byName'
            );
            if (!existingOverride) {
              // add as first override
              fieldConfig.overrides.unshift({
                matcher: {
                  id: 'byName',
                  options: field.config.displayNameFromDS ?? field.config.displayName ?? field.name,
                },
                properties,
              });
            }

            if (existingOverride && JSON.stringify(existingOverride.properties) !== JSON.stringify(properties)) {
              existingOverride.properties = properties;
            }
          }
        }
      }
    }
    return fieldConfig;
  };

  private readonly getContext = () => {
    const fieldConfig = this.getFieldConfig();
    const { queries, dsUid, labelValue } = this.state;
    const timeRange = sceneGraph.getTimeRange(this);

    if (!timeRange || !queries || !dsUid) {
      return;
    }
    const ctx = {
      origin: 'Explore Traces',
      type: 'traces',
      queries,
      timeRange: { ...timeRange.state.value },
      datasource: { uid: dsUid },
      url: window.location.href,
      id: `${JSON.stringify(queries)}`,
      title: `${labelValue}`,
      logoPath: Logo,
      fieldConfig,
    };
    if (JSON.stringify(ctx) !== JSON.stringify(this.state.context)) {
      this.setState({ context: ctx });
    }
  };
}

function isQueryRunner(o: SceneObject<SceneObjectState> | null): o is SceneQueryRunner {
  return o instanceof SceneQueryRunner;
}
