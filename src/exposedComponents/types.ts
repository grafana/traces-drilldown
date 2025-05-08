import { SceneTimeRangeState } from '@grafana/scenes';
import { AdHocVariableFilter, TimeRange } from '@grafana/data';
import { ActionViewType } from 'components/Explore/TracesByService/Tabs/TabsBarScene';

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

export interface EmbeddedTraceExplorationState extends SharedExplorationState {
  timeRangeState: SceneTimeRangeState;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
}

export interface SharedExplorationState {
  embedded?: boolean;
  embedderName?: string;
  returnToPreviousSource?: string;

  // just for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];

  initialGroupBy?: string;
  initialActionView?: ActionViewType;
  allowedActionViews?: ActionViewType[];
}
