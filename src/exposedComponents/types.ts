import { SceneTimeRangeState } from '@grafana/scenes';
import { TimeRange } from '@grafana/data';
import { TraceExplorationState } from 'pages/Explore';

export type TempoMatcher = {
  name: string;
  value: string;
  operator: '=' | '!=' | '>' | '<' | '=~' | '!~';
};

export interface OpenInExploreTracesButtonProps {
  datasourceUid?: string;
  matchers: TempoMatcher[];
  from?: string;
  to?: string;
  returnToPreviousSource?: string;
  renderButton?: (props: { href: string }) => React.ReactElement<any>;
}

export interface EmbeddedTraceExplorationState extends TraceExplorationState {
  timeRangeState: SceneTimeRangeState;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}
