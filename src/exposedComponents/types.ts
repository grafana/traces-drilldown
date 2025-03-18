import { SceneObjectState, SceneTimeRangeState } from '@grafana/scenes';
import { AdHocVariableFilter } from '@grafana/data';

export type TempoMatcher = {
  name: string;
  value: string;
  operator: '=' | '!=' | '>' | '<';
};

export interface OpenInExploreTracesButtonProps {
  datasourceUid?: string;
  matchers: TempoMatcher[];
  from?: string;
  to?: string;
  returnToPreviousSource?: string;
  renderButton?: (props: { href: string }) => React.ReactElement<any>;
}

export interface EmbeddedTraceExplorationState extends SceneObjectState {
  timeRangeState: SceneTimeRangeState;
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];
}
