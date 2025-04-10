import React from 'react';

import { SceneObjectState, SceneObjectBase, SceneComponentProps, SceneObject, SceneQueryRunner } from '@grafana/scenes';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { TraceViewPanelScene } from '../panels/TraceViewPanelScene';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { getDataSource, getTraceExplorationScene } from '../../../utils/utils';
import { AddToInvestigationButton } from '../actions/AddToInvestigationButton';
import { Button, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { GrafanaTheme2, PluginExtensionLink } from '@grafana/data';
import { ADD_TO_INVESTIGATION_MENU_TEXT, getInvestigationLink } from '../panels/PanelMenu';
import { LoadingState } from '@grafana/data';

export interface DetailsSceneState extends SceneObjectState {
  body?: SceneObject;
  addToInvestigationButton?: AddToInvestigationButton;
  investigationLink?: PluginExtensionLink;
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

      this.setupInvestigationButton(traceId);
    } else {
      this.setState({
        body: new EmptyStateScene({
          message: 'No trace selected',
        }),
      });
    }
  }

  private setupInvestigationButton(traceId: string) {
    const traceExploration = getTraceExplorationScene(this);
    const dsUid = getDataSource(traceExploration);

    const queryRunner = new SceneQueryRunner({
      datasource: { uid: dsUid },
      queries: [{ 
        refId: 'A', 
        query: traceId, 
        queryType: 'traceql',
      }],
    });

    const addToInvestigationButton = new AddToInvestigationButton({
      query: traceId,
      type: 'trace',
      dsUid,
      $data: queryRunner,
    });
    
    addToInvestigationButton.activate();
    this.setState({ addToInvestigationButton });
    this._subs.add(
      addToInvestigationButton.subscribeToState(() => {
        this.updateInvestigationLink();
      })
    );
        
    queryRunner.activate();
    
    this._subs.add(
      queryRunner.subscribeToState((state) => {
        if (state.data?.state === LoadingState.Done && state.data?.series?.length > 0) {
          const serviceNameField = state.data.series[0]?.fields?.find((f) => f.name === 'serviceName');
          
          if (serviceNameField && serviceNameField.values[0]) {
            addToInvestigationButton.setState({
              ...addToInvestigationButton.state,
              labelValue: `${serviceNameField.values[0]}`,
            });
          }
        }
      })
    );
    
    addToInvestigationButton.setState({
      ...addToInvestigationButton.state,
      labelValue: traceId,
    });
  }

  private async updateInvestigationLink() {
    const { addToInvestigationButton } = this.state;
    if (!addToInvestigationButton) return;

    const link = await getInvestigationLink(addToInvestigationButton);
    if (link) {
      this.setState({ investigationLink: link });
    }
  }

  public static Component = ({ model }: SceneComponentProps<TraceDrawerScene>) => {
    const { body, investigationLink, addToInvestigationButton } = model.useState();
    const styles = useStyles2(getStyles);
   
    const closeDrawer = () => {
      const traceExploration = getTraceExplorationScene(model);
      traceExploration.setState({
        ...traceExploration.state,
        traceId: undefined,
        spanId: undefined,
      });
    };
    
    const addToInvestigationClicked = (e: React.MouseEvent) => {
      if (investigationLink?.onClick) {
        investigationLink.onClick(e);
      }
      
      reportAppInteraction(
        USER_EVENTS_PAGES.analyse_traces,
        USER_EVENTS_ACTIONS.analyse_traces.add_to_investigation_trace_view_clicked
      );
      
      setTimeout(() => closeDrawer(), 100);
    };
    
    return (
      <div className={styles.container}>
        {addToInvestigationButton && (
          <div className={styles.buttonContainer}>
            <Button
              variant='primary'
              size='md'
              icon='plus-square'
              onClick={addToInvestigationClicked}
            >
              {ADD_TO_INVESTIGATION_MENU_TEXT}
            </Button>
          </div>
        )}
        
        {body && <body.Component model={body} />}
      </div>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
    }),
    buttonContainer: css({
      display: 'flex',
      justifyContent: 'flex-end',
      padding: `0 0 ${theme.spacing(1)} 0`,
    }),
  };
}
