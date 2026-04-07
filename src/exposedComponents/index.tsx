import { LinkButton } from '@grafana/ui';
import { OpenFeaturePluginScope } from 'featureFlags/openFeature';
import { OpenInExploreTracesButtonProps, EmbeddedTraceExplorationState } from 'exposedComponents/types';
import React, { lazy, Suspense } from 'react';
const OpenInExploreTracesButton = lazy(
  () => import('exposedComponents/OpenInExploreTracesButton/OpenInExploreTracesButton')
);
const EmbeddedTraceExploration = lazy(
  () => import('exposedComponents/EmbeddedTraceExploration/EmbeddedTraceExploration')
);

export function SuspendedOpenInExploreTracesButton(props: OpenInExploreTracesButtonProps) {
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

export function SuspendedEmbeddedTraceExploration(props: EmbeddedTraceExplorationState) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OpenFeaturePluginScope>
        <EmbeddedTraceExploration {...props} />
      </OpenFeaturePluginScope>
    </Suspense>
  );
}
