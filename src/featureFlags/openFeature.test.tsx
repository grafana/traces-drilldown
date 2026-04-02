import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { OpenFeature } from '@openfeature/web-sdk';
import { config, logWarning } from '@grafana/runtime';

import {
  ensureOpenFeaturePluginInitialized,
  OpenFeaturePluginScope,
  resetOpenFeaturePluginStateForTesting,
  TIME_SEEKER_FEATURE_FLAG_KEY,
  useTimeSeekerFeatureEnabled,
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
      featureToggles: {} as Record<string, boolean | undefined>,
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

const featureToggles = config.featureToggles as Record<string, boolean | undefined>;

function OpenFeatureTestWrapper({ children }: { children: React.ReactNode }) {
  return <OpenFeaturePluginScope>{children}</OpenFeaturePluginScope>;
}

describe('openFeature', () => {
  let setProviderAndWaitSpy: jest.SpiedFunction<(typeof OpenFeature)['setProviderAndWait']>;

  beforeEach(async () => {
    resetOpenFeaturePluginStateForTesting();
    jest.clearAllMocks();
    await OpenFeature.clearProviders();
    for (const key of Object.keys(featureToggles)) {
      delete featureToggles[key];
    }
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

  describe('useTimeSeekerFeatureEnabled', () => {
    it('returns false when the toggle is unset and evaluation is false', () => {
      const { result } = renderHook(() => useTimeSeekerFeatureEnabled(), {
        wrapper: OpenFeatureTestWrapper,
      });
      expect(result.current).toBe(false);
    });

    it('returns true when config.featureToggles enables the key', () => {
      featureToggles[TIME_SEEKER_FEATURE_FLAG_KEY] = true;
      const { result } = renderHook(() => useTimeSeekerFeatureEnabled(), {
        wrapper: OpenFeatureTestWrapper,
      });
      expect(result.current).toBe(true);
    });
  });

  describe('ensureOpenFeaturePluginInitialized', () => {
    it('resolves without logging when OFREP registration succeeds', async () => {
      await ensureOpenFeaturePluginInitialized();
      expect(logWarning).not.toHaveBeenCalled();
    });

    it('logs and installs the boot fallback provider when OFREP registration fails', async () => {
      setProviderAndWaitSpy.mockRejectedValue(new Error('ofrep-down'));
      const setProviderSpy = jest.spyOn(OpenFeature, 'setProvider');

      await ensureOpenFeaturePluginInitialized();

      await waitFor(() => {
        expect(logWarning).toHaveBeenCalledWith(
          'OpenFeature OFREP provider failed; using config.featureToggles fallback',
          expect.objectContaining({ error: 'ofrep-down' })
        );
      });
      expect(setProviderSpy).toHaveBeenCalled();
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
