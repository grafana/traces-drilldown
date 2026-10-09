import React, { useEffect } from 'react';
import { OpenFeatureProvider } from '@openfeature/react-sdk';
import { Client, MultiProvider, OpenFeature } from '@openfeature/web-sdk';

import {
  createOpenFeatureLocalStorageProvider,
  createOpenFeatureOFREPWebProvider,
  logWarning,
} from '@grafana/runtime';

/**
 * OpenFeature domain for this plugin’s evaluations.
 * Proxies Grafana’s providers so this domain stays independent of `internal-grafana-core`.
 */
export const PLUGIN_OPEN_FEATURE_DOMAIN = 'traces-drilldown';

let initOnce: Promise<void> | null = null;

/** Clears init latch between tests. Do not use in production code. */
export function resetOpenFeaturePluginStateForTesting(): void {
  initOnce = null;
}

/**
 * Registers Grafana’s shared providers on this plugin’s domain: localStorage overrides
 * (feature control UI) first, then the read-only OFREP proxy.
 *
 * Skips registration when a provider is already bound to the domain. On failure, the
 * default provider stays in place so hooks keep returning their declared defaults.
 */
export function ensureOpenFeaturePluginInitialized(): Promise<void> {
  initOnce ??= (async () => {
    // No domain provider yet: `getProvider(domain)` falls back to the default provider.
    if (OpenFeature.getProvider(PLUGIN_OPEN_FEATURE_DOMAIN) !== OpenFeature.getProvider()) {
      return;
    }

    try {
      await OpenFeature.setProviderAndWait(
        PLUGIN_OPEN_FEATURE_DOMAIN,
        new MultiProvider([
          { provider: createOpenFeatureLocalStorageProvider() },
          { provider: createOpenFeatureOFREPWebProvider() },
        ])
      );
    } catch (error: unknown) {
      logWarning('OpenFeature provider initialization failed; feature flags remain at default values', {
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
  useEffect(() => {
    void ensureOpenFeaturePluginInitialized();
  }, []);

  return <OpenFeatureProvider domain={PLUGIN_OPEN_FEATURE_DOMAIN}>{children}</OpenFeatureProvider>;
}

export function getOpenFeatureClient(): Client {
  return OpenFeature.getClient(PLUGIN_OPEN_FEATURE_DOMAIN);
}
