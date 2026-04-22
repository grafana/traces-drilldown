import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { OpenFeatureTestProvider } from '@openfeature/react-sdk';
import { OpenFeature } from '@openfeature/web-sdk';
import { logWarning } from '@grafana/runtime';

import { TIME_SEEKER_FEATURE_FLAG_KEY, useFlagTracesDrilldownTimeSeeker } from './featureFlags';
import {
  ensureOpenFeaturePluginInitialized,
  OpenFeaturePluginScope,
  PLUGIN_OPEN_FEATURE_DOMAIN,
  resetOpenFeaturePluginStateForTesting,
} from './openFeature';

jest.mock('@grafana/runtime', () => {
  const actual = jest.requireActual('@grafana/runtime');
  return {
    ...actual,
    config: {
      ...actual.config,
      namespace: 'test-ns',
      appSubUrl: '',
      openFeatureContext: {},
    },
    logWarning: jest.fn(),
  };
});

/** Real OFREP constructs `OFREPApi` in the constructor (needs fetch); that runs before `setProviderAndWait` is invoked. */
jest.mock('@openfeature/ofrep-web-provider', () => ({
  OFREPWebProvider: class MockOFREPWebProvider {
    metadata = { name: 'mock-ofrep' };
    runsOn = 'client';
  },
}));

describe('openFeature', () => {
  let setProviderAndWaitSpy: jest.SpiedFunction<(typeof OpenFeature)['setProviderAndWait']>;

  beforeEach(async () => {
    resetOpenFeaturePluginStateForTesting();
    jest.clearAllMocks();
    await OpenFeature.clearProviders();
    setProviderAndWaitSpy = jest.spyOn(OpenFeature, 'setProviderAndWait').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    resetOpenFeaturePluginStateForTesting();
    await OpenFeature.clearProviders();
  });

  describe('TIME_SEEKER_FEATURE_FLAG_KEY', () => {
    it('matches Grafana core registry (featuremgmt)', () => {
      expect(TIME_SEEKER_FEATURE_FLAG_KEY).toBe('tracesDrilldownTimeSeeker');
    });
  });

  describe('PLUGIN_OPEN_FEATURE_DOMAIN', () => {
    it('is stable for OFREP / provider binding', () => {
      expect(PLUGIN_OPEN_FEATURE_DOMAIN).toBe('traces-drilldown');
    });
  });

  describe('OpenFeaturePluginScope', () => {
    it('renders children', () => {
      render(
        <OpenFeaturePluginScope>
          <span data-testid="child">inside</span>
        </OpenFeaturePluginScope>
      );
      expect(screen.getByTestId('child')).toHaveTextContent('inside');
    });
  });

  describe('useFlagTracesDrilldownTimeSeeker', () => {
    it('returns the hook default when the flag is unset in the test provider', () => {
      const { result } = renderHook(() => useFlagTracesDrilldownTimeSeeker(), {
        wrapper: ({ children }) => (
          <OpenFeatureTestProvider domain={PLUGIN_OPEN_FEATURE_DOMAIN}>{children}</OpenFeatureTestProvider>
        ),
      });
      expect(result.current).toBe(false);
    });

    it('returns true when the test provider maps the Grafana registry flag on', () => {
      const { result } = renderHook(() => useFlagTracesDrilldownTimeSeeker(), {
        wrapper: ({ children }) => (
          <OpenFeatureTestProvider
            domain={PLUGIN_OPEN_FEATURE_DOMAIN}
            flagValueMap={{ [TIME_SEEKER_FEATURE_FLAG_KEY]: true }}
          >
            {children}
          </OpenFeatureTestProvider>
        ),
      });
      expect(result.current).toBe(true);
    });
  });

  describe('ensureOpenFeaturePluginInitialized', () => {
    it('resolves without logging when OFREP registration succeeds', async () => {
      await ensureOpenFeaturePluginInitialized();
      expect(logWarning).not.toHaveBeenCalled();
    });

    it('logs when OFREP registration fails and leaves defaults', async () => {
      setProviderAndWaitSpy.mockRejectedValue(new Error('ofrep-down'));

      await ensureOpenFeaturePluginInitialized();

      await waitFor(() => {
        expect(logWarning).toHaveBeenCalledWith(
          'OpenFeature OFREP provider failed; feature flags remain at default values',
          expect.objectContaining({ error: 'ofrep-down' })
        );
      });
    });

    it('returns the same promise when called repeatedly', async () => {
      const a = ensureOpenFeaturePluginInitialized();
      const b = ensureOpenFeaturePluginInitialized();
      expect(a).toBe(b);
      await a;
      expect(setProviderAndWaitSpy).toHaveBeenCalledTimes(1);
    });
  });
});
