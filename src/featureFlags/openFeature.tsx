import React, { useEffect } from 'react';
import { OpenFeatureProvider, useBooleanFlagValue } from '@openfeature/react-sdk';
import { OFREPWebProvider } from '@openfeature/ofrep-web-provider';
import { StandardResolutionReasons } from '@openfeature/core';
import { OpenFeature, type Provider, type ResolutionDetails } from '@openfeature/web-sdk';

import { config, logWarning } from '@grafana/runtime';

const DOMAIN = 'traces-drilldown';

/**
 * Grafana core feature toggle (`pkg/services/featuremgmt/registry.go`). Shipped in Grafana 13+;
 * see https://github.com/grafana/grafana/pull/121650
 *
 * Enable for an instance:
 * - Env: `GF_FEATURE_TOGGLES_ENABLE=tracesDrilldownTimeSeeker`
 * - Or `custom.ini`: `[feature_toggles]` → `tracesDrilldownTimeSeeker = true`
 *
 * After bumping `@grafana/data` to a release that regenerates types from that registry, you can
 * narrow this constant with `satisfies keyof FeatureToggles` (import from `@grafana/data`).
 */
export const TIME_SEEKER_FEATURE_FLAG_KEY = 'tracesDrilldownTimeSeeker' as const;
export const KG_ANNOTATIONS_FEATURE_FLAG_KEY = 'kgAnnotationsInExploreTraces' as const;

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

function defaultDetails<T>(value: T): ResolutionDetails<T> {
  return { value, reason: StandardResolutionReasons.DEFAULT };
}

/** Used when the Grafana feature API (OFREP) is unavailable — e.g. older OSS, network error. */
const grafanaBootFallbackProvider: Provider = {
  metadata: { name: 'grafana-boot-feature-toggles-fallback' },
  runsOn: 'client',
  resolveBooleanEvaluation(flagKey, defaultValue, _ctx, _log): ResolutionDetails<boolean> {
    const value = readBootBooleanFeatureToggle(flagKey, defaultValue);
    return {
      value,
      reason: StandardResolutionReasons.STATIC,
      variant: value ? 'true' : 'false',
    };
  },
  resolveStringEvaluation: (_k, defaultValue) => defaultDetails(defaultValue),
  resolveNumberEvaluation: (_k, defaultValue) => defaultDetails(defaultValue),
  resolveObjectEvaluation: (_k, defaultValue) => defaultDetails(defaultValue),
};

let initOnce: Promise<void> | null = null;
let syncFallbackRegistered = false;

/** Clears init/latch state between tests. Do not use in production code. */
export function resetOpenFeaturePluginStateForTesting(): void {
  initOnce = null;
  syncFallbackRegistered = false;
}

/**
 * Registers the sync boot provider on the OpenFeature client for `DOMAIN`.
 * Called at module load (below) so a resolver exists before any `useBooleanFlagValue` runs.
 * `OpenFeaturePluginScope` calls this again idempotently so tests can re-install after
 * `resetOpenFeaturePluginStateForTesting()` + `OpenFeature.clearProviders()`.
 */
function ensureSyncFallbackProviderRegistered(): void {
  if (syncFallbackRegistered) {
    return;
  }
  OpenFeature.setProvider(DOMAIN, grafanaBootFallbackProvider);
  syncFallbackRegistered = true;
}

/**
 * Registers OFREP against Grafana’s feature API, or `config.featureToggles` on failure.
 */
export function ensureOpenFeaturePluginInitialized(): Promise<void> {
  initOnce ??= (async () => {
    const evaluationContext = {
      targetingKey: config.namespace,
      namespace: config.namespace,
      ...config.openFeatureContext,
    };
    const baseUrl = `${config.appSubUrl ?? ''}/apis/features.grafana.app/v0alpha1/namespaces/${config.namespace}`;
    try {
      await OpenFeature.setProviderAndWait(
        DOMAIN,
        new OFREPWebProvider({
          baseUrl,
          pollInterval: -1,
          timeoutMs: 10_000,
        }),
        evaluationContext
      );
    } catch (error: unknown) {
      logWarning('OpenFeature OFREP provider failed; using config.featureToggles fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      OpenFeature.setProvider(DOMAIN, grafanaBootFallbackProvider);
    }
  })();
  return initOnce;
}

export function useTimeSeekerFeatureEnabled(): boolean {
  const fromOpenFeature = useBooleanFlagValue(TIME_SEEKER_FEATURE_FLAG_KEY, false);
  const fromBootConfig = readBootBooleanFeatureToggle(TIME_SEEKER_FEATURE_FLAG_KEY, false);
  return fromOpenFeature || fromBootConfig;
}

export function useKgAnnotationsFeatureEnabled(): boolean {
  const fromOpenFeature = useBooleanFlagValue(KG_ANNOTATIONS_FEATURE_FLAG_KEY, false);
  const fromBootConfig = readBootBooleanFeatureToggle(KG_ANNOTATIONS_FEATURE_FLAG_KEY, false);
  return fromOpenFeature || fromBootConfig;
}

export async function evaluateKgAnnotationsFlag(): Promise<boolean> {
  await ensureOpenFeaturePluginInitialized();
  const client = OpenFeature.getClient(DOMAIN);
  const fromOpenFeature = client.getBooleanValue(KG_ANNOTATIONS_FEATURE_FLAG_KEY, false);
  const fromBootConfig = readBootBooleanFeatureToggle(KG_ANNOTATIONS_FEATURE_FLAG_KEY, false);
  return fromOpenFeature || fromBootConfig;
}

/**
 * Wraps the app with OpenFeature. Supplies React context for hooks; re-asserts the boot
 * provider after test resets. OFREP is registered asynchronously and may refine flag values when ready.
 */
export function OpenFeaturePluginScope({ children }: { children: React.ReactNode }) {
  ensureSyncFallbackProviderRegistered();

  useEffect(() => {
    void ensureOpenFeaturePluginInitialized();
  }, []);

  return <OpenFeatureProvider domain={DOMAIN}>{children}</OpenFeatureProvider>;
}

ensureSyncFallbackProviderRegistered();
