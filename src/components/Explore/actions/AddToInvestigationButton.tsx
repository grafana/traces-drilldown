import { TimeRange } from '@grafana/data';
import { sceneGraph, SceneObject, SceneObjectBase, SceneObjectState, SceneQueryRunner } from '@grafana/scenes';
import { DataQuery, DataSourceRef } from '@grafana/schema';

import Logo from '../../../../src/img/logo.svg';

interface AddToInvestigationButtonState extends SceneObjectState {
  dsUid?: string;
  query?: string;
  labelValue?: string;
  type?: string;
  context?: ExtensionContext;
  queries: DataQuery[];
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

  private readonly getContext = () => {
    const { queries, dsUid, labelValue, type = 'traceMetrics' } = this.state;
    const timeRange = sceneGraph.getTimeRange(this);

    if (!timeRange || !queries || !dsUid) {
      return;
    }
    const ctx = {
      origin: 'Explore Traces',
      type,
      queries,
      timeRange: { ...timeRange.state.value },
      datasource: { uid: dsUid },
      url: window.location.href,
      id: `${JSON.stringify(queries)}`,
      title: `${labelValue}`,
      logoPath: Logo,
    };
    if (JSON.stringify(ctx) !== JSON.stringify(this.state.context)) {
      this.setState({ context: ctx });
    }
  };
}

function isQueryRunner(o: SceneObject<SceneObjectState> | null): o is SceneQueryRunner {
  return o instanceof SceneQueryRunner;
}
