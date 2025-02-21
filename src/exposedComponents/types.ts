
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
