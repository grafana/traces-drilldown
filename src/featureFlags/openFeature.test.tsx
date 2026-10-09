import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { OpenFeatureTestProvider } from '@openfeature/react-sdk';
import { TypedInMemoryProvider, OpenFeature, type Provider } from '@openfeature/web-sdk';
import {
  createOpenFeatureLocalStorageProvider,
  createOpenFeatureOFREPWebProvider,
  logWarning,
} from '@grafana/runtime';

import {
  isUseValueTypeFilteringEnabled,
  TIME_SEEKER_FEATURE_FLAG_KEY,
  TRACES_DRILLDOWN_USE_VALUE_TYPE_FILTER,
  useFlagTracesDrilldownTimeSeeker,
  useFlagUseValueTypeFiltering,
} from './featureFlags';
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
    createOpenFeatureLocalStorageProvider: jest.fn(),
    createOpenFeatureOFREPWebProvider: jest.fn(),
  };
});

const localStorageProvider = { metadata: { name: 'local-storage-provider' } } as Provider;
const ofrepProvider = { metadata: { name: 'ofrep-provider' } } as Provider;

describe('openFeature', () => {
  let setProviderAndWaitSpy: jest.SpiedFunction<(typeof OpenFeature)['setProviderAndWait']>;

  beforeEach(async () => {
    resetOpenFeaturePluginStateForTesting();
    jest.clearAllMocks();
    jest.mocked(createOpenFeatureLocalStorageProvider).mockReturnValue(localStorageProvider as never);
    jest.mocked(createOpenFeatureOFREPWebProvider).mockReturnValue(ofrepProvider as never);
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
    it('is stable for provider binding', () => {
      expect(PLUGIN_OPEN_FEATURE_DOMAIN).toBe('traces-drilldown');
    });
  });

  describe('OpenFeaturePluginScope', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

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
    it('registers the shared localStorage and OFREP providers', async () => {
      await ensureOpenFeaturePluginInitialized();

      expect(logWarning).not.toHaveBeenCalled();
      expect(createOpenFeatureLocalStorageProvider).toHaveBeenCalledTimes(1);
      expect(createOpenFeatureOFREPWebProvider).toHaveBeenCalledTimes(1);
      expect(setProviderAndWaitSpy).toHaveBeenCalledWith(
        PLUGIN_OPEN_FEATURE_DOMAIN,
        expect.objectContaining({
          providerEntries: [
            { name: 'local-storage-provider', provider: localStorageProvider },
            { name: 'ofrep-provider', provider: ofrepProvider },
          ],
        })
      );
    });

    it('logs when provider registration fails and leaves defaults', async () => {
      setProviderAndWaitSpy.mockRejectedValue(new Error('ofrep-down'));

      await ensureOpenFeaturePluginInitialized();

      await waitFor(() => {
        expect(logWarning).toHaveBeenCalledWith(
          'OpenFeature provider initialization failed; feature flags remain at default values',
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

    it('does not replace a provider already registered for the domain', async () => {
      setProviderAndWaitSpy.mockRestore();
      await OpenFeature.setProviderAndWait(PLUGIN_OPEN_FEATURE_DOMAIN, new TypedInMemoryProvider({}));
      const spy = jest.spyOn(OpenFeature, 'setProviderAndWait');

      await ensureOpenFeaturePluginInitialized();

      expect(createOpenFeatureLocalStorageProvider).not.toHaveBeenCalled();
      expect(createOpenFeatureOFREPWebProvider).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('TRACES_DRILLDOWN_USE_VALUE_TYPE_FILTER', () => {
    it('matches Grafana core registry (featuremgmt)', () => {
      expect(TRACES_DRILLDOWN_USE_VALUE_TYPE_FILTER).toBe('tracesDrilldown.useValueTypeFiltering');
    });
  });

  describe('isUseValueTypeFilteringEnabled', () => {
    it('should return default when the flag is unset in the test provider', () => {
      expect(isUseValueTypeFilteringEnabled()).toBe(false);
    });

    it('should return true when the core-domain provider maps the flag on', async () => {
      setProviderAndWaitSpy.mockRestore();
      await OpenFeature.setProviderAndWait(
        PLUGIN_OPEN_FEATURE_DOMAIN,
        new TypedInMemoryProvider({
          [TRACES_DRILLDOWN_USE_VALUE_TYPE_FILTER]: {
            disabled: false,
            variants: { on: true, off: false },
            defaultVariant: 'on',
          },
        })
      );

      expect(isUseValueTypeFilteringEnabled()).toBe(true);
    });
  });

  describe('useFlagUseValueTypeFiltering', () => {
    it('returns the hook default when the flag is unset in the test provider', () => {
      const { result } = renderHook(() => useFlagUseValueTypeFiltering(), {
        wrapper: ({ children }) => (
          <OpenFeatureTestProvider domain={PLUGIN_OPEN_FEATURE_DOMAIN}>{children}</OpenFeatureTestProvider>
        ),
      });
      expect(result.current).toBe(false);
    });

    it('returns true when the test provider maps the Grafana registry flag on', () => {
      const { result } = renderHook(() => useFlagUseValueTypeFiltering(), {
        wrapper: ({ children }) => (
          <OpenFeatureTestProvider
            domain={PLUGIN_OPEN_FEATURE_DOMAIN}
            flagValueMap={{ [TRACES_DRILLDOWN_USE_VALUE_TYPE_FILTER]: true }}
          >
            {children}
          </OpenFeatureTestProvider>
        ),
      });
      expect(result.current).toBe(true);
    });
  });
});
