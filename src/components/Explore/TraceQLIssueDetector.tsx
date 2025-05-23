import { LoadingState, dateTime } from '@grafana/data';
import {
  SceneObjectBase,
  SceneObjectState,
  SceneTimeRange,
  SceneQueryRunner,
} from '@grafana/scenes';
import { getDatasourceVariable } from '../../utils/utils';
import { Alert, LinkButton } from '@grafana/ui';
import React from 'react';

export interface TraceQLIssueDetectorState extends SceneObjectState {
  hasIssue: boolean;
}

export class TraceQLIssueDetector extends SceneObjectBase<TraceQLIssueDetectorState> {
  constructor() {
    super({
      hasIssue: false,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {    
    this.runIssueDetectionQuery();

    const datasourceVar = getDatasourceVariable(this);
    this._subs.add(
      datasourceVar.subscribeToState((newState, prevState) => {
        if (newState.value !== prevState.value) {
          this.resetIssues();
          this.runIssueDetectionQuery();
        }
      })
    );
  }

  private runIssueDetectionQuery() {
    const datasourceVar = getDatasourceVariable(this);
    
    // Create a minimal time range to reduce resource usage
    const now = dateTime();
    const from = dateTime(now).subtract(1, 'minute');
    const minimalTimeRange = new SceneTimeRange({
      from: from.toISOString(),
      to: now.toISOString(),
    });
    
    const issueDetector = new SceneQueryRunner({
      maxDataPoints: 1,
      datasource: { uid: String(datasourceVar.state.value) },
      $timeRange: minimalTimeRange,
      queries: [{
        refId: 'issueDetectorQuery',
        query: '{} | rate()',
        queryType: 'traceql',
        tableType: 'spans',
        limit: 1,
        spss: 1,
        filters: [],
      }],
    });
    
    this._subs.add(
      issueDetector.subscribeToState((state) => {
        if (state.data?.state === LoadingState.Error) {
          const message = state.data?.errors?.[0]?.message || '';
          // This is the error message when the datasource is not configured for TraceQL metrics
          // https://grafana.com/docs/tempo/latest/operations/traceql-metrics/#activate-and-configure-the-local-blocks-processor
          if (message.includes('localblocks processor not found')) {
            this.setState({ hasIssue: true });
          }
        }
      })
    );
    
    issueDetector.activate();
  }

  public resetIssues() {
    this.setState({
      hasIssue: false,
    });
  }
} 

const TraceQLWarningTitle = 'TraceQL metrics not configured';
const TraceQLWarningMessage = 'We found an error running a TraceQL metrics query: "localblocks processor not found". This typically means the "local-blocks" processor is not configured in Tempo, which is required for Grafana Traces Drilldown to work.';

export const TraceQLConfigWarning: React.FC<{ detector: TraceQLIssueDetector }> = ({ detector }) => {
  const { hasIssue } = detector.useState();

  if (!hasIssue) {
    return null;
  }

  return (
    <Alert
      severity="warning"
      title={TraceQLWarningTitle}
    >
      <p>
        {TraceQLWarningMessage}
        <LinkButton
          icon="external-link-alt"
          fill="text"
          size="sm"
          target="_blank"
          href="https://grafana.com/docs/tempo/latest/operations/traceql-metrics"
        >
          Read documentation
        </LinkButton>
      </p>
    </Alert>
  );
};
