import { AdHocVariableFilter, TimeRange } from '@grafana/data';

export type TempoMatcher = {
  name: string;
  value: string;
  operator: '=' | '!=' | '>' | '<' | '=~' | '!~';
};

export type ActionViewType = 'traceList' | 'breakdown' | 'structure' | 'comparison' | 'exceptions' | 'adaptiveTraces';
export interface OpenInExploreTracesButtonProps {
  datasourceUid?: string;
  matchers: TempoMatcher[];
  from?: string;
  to?: string;
  returnToPreviousSource?: string;
  renderButton?: (props: { href: string }) => React.ReactElement<any>;
}

export interface EmbeddedTraceExplorationState extends SharedExplorationState {
  initialTimeRange: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  urlSync?: boolean;
}

export interface SharedExplorationState {
  embedded?: boolean;
  embeddedMini?: boolean;
  embedderName?: string;
  returnToPreviousSource?: string;

  // just for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];

  initialGroupBy?: string;
  initialActionView?: ActionViewType;
  allowedActionViews?: ActionViewType[];
  initialMetric?: string;
}
