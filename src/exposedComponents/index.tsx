import { Trans } from '@grafana/i18n';
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
          <Trans i18nKey="exposed-components.open-in-traces-drilldown">Open in Traces Drilldown</Trans>
        </LinkButton>
      }
    >
      <OpenInExploreTracesButton {...props} />
    </Suspense>
  );
}

export function SuspendedEmbeddedTraceExploration(props: EmbeddedTraceExplorationState) {
  return (
    <Suspense fallback={<div><Trans i18nKey="exposed-components.loading">Loading...</Trans></div>}>
      <OpenFeaturePluginScope>
        <EmbeddedTraceExploration {...props} />
      </OpenFeaturePluginScope>
    </Suspense>
  );
}
