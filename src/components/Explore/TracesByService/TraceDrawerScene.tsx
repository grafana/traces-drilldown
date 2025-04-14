import React from 'react';

import { SceneObjectState, SceneObjectBase, SceneComponentProps, SceneObject } from '@grafana/scenes';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { TraceViewPanelScene } from '../panels/TraceViewPanelScene';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { getTraceExplorationScene } from '../../../utils/utils';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

export interface DetailsSceneState extends SceneObjectState {
  body?: SceneObject;
}

export class TraceDrawerScene extends SceneObjectBase<DetailsSceneState> {
  constructor(state: Partial<DetailsSceneState>) {
    super({
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    this.updateBody();

    const traceExploration = getTraceExplorationScene(this);

    traceExploration.subscribeToState((newState, prevState) => {
      if (newState.traceId !== prevState.traceId || newState.spanId !== prevState.spanId) {
        this.updateBody();
        reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.open_trace, {
          traceId: newState.traceId,
          spanId: newState.spanId,
        });
      }
    });
  }

  private updateBody() {
    const traceExploration = getTraceExplorationScene(this);
    const traceId = traceExploration.state.traceId;

    if (traceId) {
      this.setState({
        body: new TraceViewPanelScene({
          traceId,
          spanId: traceExploration.state.spanId,
        }),
      });
    } else {
      this.setState({
        body: new EmptyStateScene({
          message: 'No trace selected',
        }),
      });
    }
  }

  public static Component = ({ model }: SceneComponentProps<TraceDrawerScene>) => {
    const { body } = model.useState();
    const styles = useStyles2(getStyles);
   
    return (
      <div className={styles.container}>
        {body && <body.Component model={body} />}
      </div>
    );
  };
}

function getStyles() {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
    }),
  };
}
