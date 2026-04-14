import type { FeatureToggles } from '@grafana/data';
import { useBooleanFlagDetails } from '@openfeature/react-sdk';

/**
 * Grafana registry-backed flags via OpenFeature. Call sites must sit under
 * `OpenFeaturePluginScope` from `./openFeature`.
 */
const queryLibraryKey = 'queryLibrary' satisfies keyof FeatureToggles;

/** `pkg/services/featuremgmt/registry.go` — widen until available in `@grafana/data` types (FeatureToggles). */
const TRACES_DRILLDOWN_TIME_SEEKER = 'tracesDrilldownTimeSeeker' as const;
const tracesDrilldownTimeSeekerKey = TRACES_DRILLDOWN_TIME_SEEKER as keyof FeatureToggles;

/** Stable string for analytics and other non-hook call sites. */
export const TIME_SEEKER_FEATURE_FLAG_KEY = TRACES_DRILLDOWN_TIME_SEEKER;

export function useFlagTracesDrilldownTimeSeeker(): boolean {
  return useBooleanFlagDetails(tracesDrilldownTimeSeekerKey, false).value;
}

export function useFlagQueryLibrary(): boolean {
  return useBooleanFlagDetails(queryLibraryKey, false).value;
}
