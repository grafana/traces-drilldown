import type { FeatureToggles } from '@grafana/data';
import { useBooleanFlagDetails } from '@openfeature/react-sdk';
import { OpenFeature } from '@openfeature/web-sdk';

// Grafana core feature flag domain
const GRAFANA_OPEN_FEATURE_DOMAIN = 'internal-grafana-core';

/**
 * Grafana registry-backed flags via OpenFeature. Call sites must sit under
 * `OpenFeaturePluginScope` from `./openFeature`.
 */
const queryLibraryKey = 'queryLibrary' satisfies keyof FeatureToggles;
const tempoAlertingKey = 'tempoAlerting' as keyof FeatureToggles;

/** `pkg/services/featuremgmt/registry.go` — widen until available in `@grafana/data` types (FeatureToggles). */
const TRACES_DRILLDOWN_TIME_SEEKER = 'tracesDrilldownTimeSeeker' as const;
export const TIME_SEEKER_FEATURE_FLAG_KEY = TRACES_DRILLDOWN_TIME_SEEKER;

const tracesDrilldownTimeSeekerKey = TRACES_DRILLDOWN_TIME_SEEKER as keyof FeatureToggles;

export const KG_ANNOTATIONS_FEATURE_FLAG_KEY = 'kgAnnotationsInExploreTraces' as const;

/** Reads the current flag value synchronously from the OpenFeature client. */
export function isKgAnnotationsFeatureEnabled(): boolean {
  return OpenFeature.getClient(GRAFANA_OPEN_FEATURE_DOMAIN).getBooleanValue(KG_ANNOTATIONS_FEATURE_FLAG_KEY, false);
}

export function useFlagTracesDrilldownTimeSeeker(): boolean {
  return useBooleanFlagDetails(tracesDrilldownTimeSeekerKey, false).value;
}

export function useFlagQueryLibrary(): boolean {
  return useBooleanFlagDetails(queryLibraryKey, false).value;
}

export function useFlagTempoAlerting(): boolean {
  return useBooleanFlagDetails(tempoAlertingKey, false).value;
}
