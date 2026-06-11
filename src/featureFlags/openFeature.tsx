import React, { useEffect } from 'react';
import { OpenFeatureProvider } from '@openfeature/react-sdk';
import { OFREPWebProvider } from '@openfeature/ofrep-web-provider';
import { StandardResolutionReasons } from '@openfeature/core';
import { OpenFeature, type Provider, type ResolutionDetails } from '@openfeature/web-sdk';

import { config, logWarning } from '@grafana/runtime';

/** OpenFeature domain for this plugin’s evaluations (OFREP to Grafana’s feature API). */
export const PLUGIN_OPEN_FEATURE_DOMAIN = 'traces-drilldown';

/** OFREP base URL for Grafana’s feature API (same host as the app, respects `appSubUrl`). Browser-only. */
function getFeaturesOfrepBaseUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const sub = (config.appSubUrl ?? '').replace(/\/$/, '');
  const path = `${sub}/apis/features.grafana.app/v0alpha1/namespaces/${encodeURIComponent(config.namespace)}`;
  const pathname = path.startsWith('/') ? path : `/${path}`;
  return new URL(pathname, window.location.origin).toString();
}

function defaultDetails<T>(value: T): ResolutionDetails<T> {
  return { value, reason: StandardResolutionReasons.DEFAULT };
}

/**
 * Resolves every flag to the evaluator’s default until a live provider (OFREP) is ready.
 * Does not read boot config; avoids stale values vs the feature API.
 */
const defaultOnlyProvider: Provider = {
  metadata: { name: 'traces-drilldown-default-flags' },
  runsOn: 'client',
  resolveBooleanEvaluation(_flagKey, defaultValue): ResolutionDetails<boolean> {
    return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT };
  },
  resolveStringEvaluation: (_k, defaultValue) => defaultDetails(defaultValue),
  resolveNumberEvaluation: (_k, defaultValue) => defaultDetails(defaultValue),
  resolveObjectEvaluation: (_k, defaultValue) => defaultDetails(defaultValue),
};

let initOnce: Promise<void> | null = null;
let defaultProviderRegistered = false;

/** Clears init/latch state between tests. Do not use in production code. */
export function resetOpenFeaturePluginStateForTesting(): void {
  initOnce = null;
  defaultProviderRegistered = false;
}

/**
 * Ensures a synchronous provider exists before any OpenFeature hooks run.
 * Re-asserted from `OpenFeaturePluginScope` so tests can re-install after
 * `resetOpenFeaturePluginStateForTesting()` + `OpenFeature.clearProviders()`.
 */
function ensureDefaultOnlyProviderRegistered(): void {
  if (defaultProviderRegistered) {
    return;
  }
  OpenFeature.setProvider(PLUGIN_OPEN_FEATURE_DOMAIN, defaultOnlyProvider);
  defaultProviderRegistered = true;
}

/**
 * Registers OFREP against Grafana’s feature API. On failure, the default-only provider
 * stays in place so hooks keep returning their declared defaults.
 */
export function ensureOpenFeaturePluginInitialized(): Promise<void> {
  initOnce ??= (async () => {
    const evaluationContext = {
      targetingKey: config.namespace,
      namespace: config.namespace,
      ...config.openFeatureContext,
    };
    const baseUrl = getFeaturesOfrepBaseUrl();
    if (!baseUrl) {
      logWarning('OpenFeature OFREP skipped; not in a browser context', {});
      return;
    }
    try {
      await OpenFeature.setProviderAndWait(
        PLUGIN_OPEN_FEATURE_DOMAIN,
        new OFREPWebProvider({
          baseUrl,
          disableVisibilityRefresh: true, // Do not refresh
          cacheMode: 'disabled', // Do not write to localStorage
          timeoutMs: 10_000,
        }),
        evaluationContext
      );
    } catch (error: unknown) {
      logWarning('OpenFeature OFREP provider failed; feature flags remain at default values', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
  return initOnce;
}

/**
 * Wraps the app with OpenFeature for {@link PLUGIN_OPEN_FEATURE_DOMAIN}.
 *
 * Any component that calls `useBooleanFlag*` / `useFlag*` from `featureFlags.tsx` must render
 * under this scope (or tests must wrap with the same provider), otherwise React OpenFeature
 * hooks will not resolve a client.
 */
export function OpenFeaturePluginScope({ children }: { children: React.ReactNode }) {
  ensureDefaultOnlyProviderRegistered();

  useEffect(() => {
    void ensureOpenFeaturePluginInitialized();
  }, []);

  return <OpenFeatureProvider domain={PLUGIN_OPEN_FEATURE_DOMAIN}>{children}</OpenFeatureProvider>;
}

ensureDefaultOnlyProviderRegistered();
