import type { FeatureToggles } from '@grafana/data';
import { useBooleanFlagDetails } from '@openfeature/react-sdk';
import { OpenFeature } from '@openfeature/web-sdk';

import { PLUGIN_OPEN_FEATURE_DOMAIN } from './openFeature';

import { config } from '@grafana/runtime';

/**
 * Grafana registry-backed flags via OpenFeature. Call sites must sit under
 * `OpenFeaturePluginScope` from `./openFeature`.
 */
const queryLibraryKey = 'queryLibrary' satisfies keyof FeatureToggles;

/** `pkg/services/featuremgmt/registry.go` — widen until available in `@grafana/data` types (FeatureToggles). */
const TRACES_DRILLDOWN_TIME_SEEKER = 'tracesDrilldownTimeSeeker' as const;
export const TIME_SEEKER_FEATURE_FLAG_KEY = TRACES_DRILLDOWN_TIME_SEEKER;

const tracesDrilldownTimeSeekerKey = TRACES_DRILLDOWN_TIME_SEEKER as keyof FeatureToggles;

export const KG_ANNOTATIONS_FEATURE_FLAG_KEY = 'kgAnnotationsInExploreTraces' as const;

/** Reads the current flag value synchronously from the OpenFeature client. */
export function isKgAnnotationsFeatureEnabled(): boolean {
  const client = OpenFeature.getClient(PLUGIN_OPEN_FEATURE_DOMAIN);
  const fromOpenFeature = client.getBooleanValue(KG_ANNOTATIONS_FEATURE_FLAG_KEY, false);
  const fromBootConfig = readBootBooleanFeatureToggle(KG_ANNOTATIONS_FEATURE_FLAG_KEY, false);
  return fromOpenFeature || fromBootConfig;
}

export function useFlagTracesDrilldownTimeSeeker(): boolean {
  return useBooleanFlagDetails(tracesDrilldownTimeSeekerKey, false).value;
}

export function useFlagQueryLibrary(): boolean {
  return useBooleanFlagDetails(queryLibraryKey, false).value;
}

/**
 * Reads a boolean from Grafana’s boot `config.featureToggles` without asserting the whole object’s shape.
 * Only actual booleans count; anything else falls back to `defaultValue` (avoids treating `"true"` etc. as on).
 */
function readBootBooleanFeatureToggle(flagKey: string, defaultValue: boolean): boolean {
  const togglesUnknown: unknown = config.featureToggles;
  if (togglesUnknown == null || typeof togglesUnknown !== 'object') {
    return defaultValue;
  }
  const raw = (togglesUnknown as Record<string, unknown>)[flagKey];
  return typeof raw === 'boolean' ? raw : defaultValue;
}
