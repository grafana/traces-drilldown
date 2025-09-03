import { createDefaultGroupBySelectorConfig, mergeConfigurations } from './utils';
import { DomainType, DomainConfig } from './types';

describe('Domain Configuration Tests', () => {
  describe('createDefaultGroupBySelectorConfig', () => {
    describe('Traces Domain', () => {
      let tracesConfig: Partial<DomainConfig>;

      beforeEach(() => {
        tracesConfig = createDefaultGroupBySelectorConfig('traces');
      });

      it('should have correct attribute prefixes', () => {
        expect(tracesConfig.attributePrefixes).toEqual({
          span: 'span.',
          resource: 'resource.',
          event: 'event.',
        });
      });

      it('should have traces-specific filtering rules', () => {
        expect(tracesConfig.filteringRules?.excludeFilteredFromRadio).toBe(true);
        expect(tracesConfig.filteringRules?.excludeAttributesForMetrics).toEqual({
          'rate': ['status'],
          'errors': ['status'],
        });
        expect(tracesConfig.filteringRules?.excludeAttributesForFilters).toEqual({
          'nestedSetParent': ['rootName', 'rootServiceName'],
        });
      });

      it('should have traces-specific ignored attributes', () => {
        const expectedIgnored = [
          'duration',
          'event:name',
          'nestedSetLeft',
          'nestedSetParent',
          'nestedSetRight',
          'span:duration',
          'span:id',
          'trace:duration',
          'trace:id',
          'traceDuration',
        ];

        expect(tracesConfig.ignoredAttributes).toEqual(expectedIgnored);
      });

      it('should have appropriate layout configuration', () => {
        expect(tracesConfig.layoutConfig).toEqual({
          additionalWidthPerItem: 40,
          widthOfOtherAttributes: 180,
          enableResponsiveRadioButtons: true,
        });
      });

      it('should have search configuration enabled', () => {
        expect(tracesConfig.searchConfig).toEqual({
          enabled: true,
          maxOptions: 1000,
          caseSensitive: false,
          searchFields: ['label', 'value'],
        });
      });

      it('should have virtualization enabled', () => {
        expect(tracesConfig.virtualizationConfig).toEqual({
          enabled: true,
        });
      });
    });

    describe('Logs Domain', () => {
      let logsConfig: Partial<DomainConfig>;

      beforeEach(() => {
        logsConfig = createDefaultGroupBySelectorConfig('logs');
      });

      it('should have logs-specific attribute prefixes', () => {
        expect(logsConfig.attributePrefixes).toEqual({
          log: 'log.',
          resource: 'resource.',
        });
      });

      it('should have basic filtering rules', () => {
        expect(logsConfig.filteringRules?.excludeFilteredFromRadio).toBe(true);
        expect(logsConfig.filteringRules?.excludeAttributesForMetrics).toBeUndefined();
      });

      it('should have logs-specific ignored attributes', () => {
        expect(logsConfig.ignoredAttributes).toEqual(['timestamp', 'log:id']);
      });

      it('should have standard layout configuration', () => {
        expect(logsConfig.layoutConfig).toEqual({
          additionalWidthPerItem: 40,
          widthOfOtherAttributes: 180,
          enableResponsiveRadioButtons: true,
        });
      });
    });

    describe('Metrics Domain', () => {
      let metricsConfig: Partial<DomainConfig>;

      beforeEach(() => {
        metricsConfig = createDefaultGroupBySelectorConfig('metrics');
      });

      it('should have metrics-specific attribute prefixes', () => {
        expect(metricsConfig.attributePrefixes).toEqual({
          metric: 'metric.',
          resource: 'resource.',
        });
      });

      it('should have metrics-specific ignored attributes', () => {
        expect(metricsConfig.ignoredAttributes).toEqual(['__name__', 'timestamp']);
      });

      it('should have basic filtering rules', () => {
        expect(metricsConfig.filteringRules?.excludeFilteredFromRadio).toBe(true);
      });
    });

    describe('Custom Domain', () => {
      let customConfig: Partial<DomainConfig>;

      beforeEach(() => {
        customConfig = createDefaultGroupBySelectorConfig('custom');
      });

      it('should have empty attribute prefixes', () => {
        expect(customConfig.attributePrefixes).toEqual({});
      });

      it('should have empty ignored attributes', () => {
        expect(customConfig.ignoredAttributes).toEqual([]);
      });

      it('should have minimal filtering rules', () => {
        expect(customConfig.filteringRules).toEqual({});
      });

      it('should have standard configurations for other settings', () => {
        expect(customConfig.layoutConfig?.enableResponsiveRadioButtons).toBe(true);
        expect(customConfig.searchConfig?.enabled).toBe(true);
        expect(customConfig.virtualizationConfig?.enabled).toBe(true);
      });
    });

    describe('Domain Type Validation', () => {
      const validDomains: DomainType[] = ['traces', 'logs', 'metrics', 'custom'];

      it.each(validDomains)('should handle %s domain', (domain) => {
        const config = createDefaultGroupBySelectorConfig(domain);

        expect(config).toBeDefined();
        expect(config.attributePrefixes).toBeDefined();
        expect(config.filteringRules).toBeDefined();
        expect(config.ignoredAttributes).toBeDefined();
        expect(config.layoutConfig).toBeDefined();
        expect(config.searchConfig).toBeDefined();
        expect(config.virtualizationConfig).toBeDefined();
      });

      it('should default to custom domain for unknown types', () => {
        const unknownConfig = createDefaultGroupBySelectorConfig('unknown' as DomainType);
        const customConfig = createDefaultGroupBySelectorConfig('custom');

        expect(unknownConfig).toEqual(customConfig);
      });
    });
  });

  describe('mergeConfigurations', () => {
    it('should merge domain config with user config', () => {
      const domainConfig = createDefaultGroupBySelectorConfig('traces');
      const userConfig = {
        attributePrefixes: {
          custom: 'custom.',
        },
        filteringRules: {
          excludeFilteredFromRadio: false,
        },
        ignoredAttributes: ['custom-ignored'],
      };

      const merged = mergeConfigurations(domainConfig, userConfig);

      // Should merge attribute prefixes
      expect(merged.attributePrefixes).toEqual({
        span: 'span.',
        resource: 'resource.',
        event: 'event.',
        custom: 'custom.',
      });

      // Should override filtering rules
      expect(merged.filteringRules.excludeFilteredFromRadio).toBe(false);
      expect(merged.filteringRules.excludeAttributesForMetrics).toEqual({
        'rate': ['status'],
        'errors': ['status'],
      });

      // Should use user-provided ignored attributes
      expect(merged.ignoredAttributes).toEqual(['custom-ignored']);

      // Should preserve domain layout config
      expect(merged.layoutConfig).toEqual(domainConfig.layoutConfig);
    });

    it('should handle partial user configurations', () => {
      const domainConfig = createDefaultGroupBySelectorConfig('logs');
      const partialUserConfig = {
        searchConfig: {
          maxOptions: 500,
        },
      };

      const merged = mergeConfigurations(domainConfig, partialUserConfig);

      // Should merge search config
      expect(merged.searchConfig).toEqual({
        enabled: true,
        maxOptions: 500, // overridden
        caseSensitive: false,
        searchFields: ['label', 'value'],
      });

      // Should preserve other domain configs
      expect(merged.attributePrefixes).toEqual(domainConfig.attributePrefixes);
      expect(merged.filteringRules).toEqual(domainConfig.filteringRules);
    });

    it('should handle empty user configuration', () => {
      const domainConfig = createDefaultGroupBySelectorConfig('metrics');
      const merged = mergeConfigurations(domainConfig, {});

      expect(merged).toEqual(domainConfig);
    });

    it('should handle undefined values gracefully', () => {
      const domainConfig = {
        attributePrefixes: { test: 'test.' },
        filteringRules: { excludeFilteredFromRadio: true },
      };
      const userConfig = {
        attributePrefixes: undefined,
        ignoredAttributes: ['test'],
      };

      const merged = mergeConfigurations(domainConfig, userConfig);

      expect(merged.attributePrefixes).toEqual({ test: 'test.' });
      expect(merged.ignoredAttributes).toEqual(['test']);
    });
  });

  describe('Configuration Consistency', () => {
    it('should maintain consistent structure across all domains', () => {
      const domains: DomainType[] = ['traces', 'logs', 'metrics', 'custom'];
      const requiredKeys = [
        'attributePrefixes',
        'filteringRules',
        'ignoredAttributes',
        'layoutConfig',
        'searchConfig',
        'virtualizationConfig',
      ];

      domains.forEach(domain => {
        const config = createDefaultGroupBySelectorConfig(domain);

        requiredKeys.forEach(key => {
          expect(config).toHaveProperty(key);
        });
      });
    });

    it('should have consistent layout configurations', () => {
      const domains: DomainType[] = ['traces', 'logs', 'metrics', 'custom'];

      domains.forEach(domain => {
        const config = createDefaultGroupBySelectorConfig(domain);

        expect(config.layoutConfig?.additionalWidthPerItem).toBe(40);
        expect(config.layoutConfig?.widthOfOtherAttributes).toBe(180);
        expect(config.layoutConfig?.enableResponsiveRadioButtons).toBe(true);
      });
    });

    it('should have consistent search configurations', () => {
      const domains: DomainType[] = ['traces', 'logs', 'metrics', 'custom'];

      domains.forEach(domain => {
        const config = createDefaultGroupBySelectorConfig(domain);

        expect(config.searchConfig?.enabled).toBe(true);
        expect(config.searchConfig?.maxOptions).toBe(1000);
        expect(config.searchConfig?.caseSensitive).toBe(false);
        expect(config.searchConfig?.searchFields).toEqual(['label', 'value']);
      });
    });

    it('should have consistent virtualization configurations', () => {
      const domains: DomainType[] = ['traces', 'logs', 'metrics', 'custom'];

      domains.forEach(domain => {
        const config = createDefaultGroupBySelectorConfig(domain);

        expect(config.virtualizationConfig?.enabled).toBe(true);
      });
    });
  });
});
