import { LinkButton } from '@grafana/ui';
import { OpenInExploreTracesButtonProps } from 'exposedComponents/types';
import React, { lazy, Suspense } from 'react';
const OpenInExploreTracesButton = lazy(() => import('exposedComponents/OpenInExploreTracesButton/OpenInExploreTracesButton'));

function SuspendedOpenInExploreTracesButton(props: OpenInExploreTracesButtonProps) {
  return (
    <Suspense
      fallback={
        <LinkButton variant="secondary" disabled>
          Open in Traces Drilldown
        </LinkButton>
      }
    >
      <OpenInExploreTracesButton {...props} />
    </Suspense>
  );
}

export const exposedComponents = [
  {
    id: 'grafana-exploretraces-app/open-in-explore-traces-button/v1',
    title: 'Open in Traces Drilldown button',
    description: 'A button that opens a traces view in the Traces drilldown app.',
    component: SuspendedOpenInExploreTracesButton,
  },
];
