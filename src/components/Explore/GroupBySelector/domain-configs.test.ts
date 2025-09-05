import { createDefaultGroupBySelectorConfig, mergeConfigurations } from './utils';
import { DomainConfig } from './types';

describe('Domain Configuration Tests', () => {
  describe('createDefaultGroupBySelectorConfig', () => {
    describe('Traces Domain', () => {
      let tracesConfig: Partial<DomainConfig>;

      beforeEach(() => {
        tracesConfig = createDefaultGroupBySelectorConfig();
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


    it('should return traces configuration by default', () => {
      const config = createDefaultGroupBySelectorConfig();

      expect(config).toBeDefined();
      expect(config.attributePrefixes).toBeDefined();
      expect(config.filteringRules).toBeDefined();
      expect(config.ignoredAttributes).toBeDefined();
      expect(config.layoutConfig).toBeDefined();
      expect(config.searchConfig).toBeDefined();
      expect(config.virtualizationConfig).toBeDefined();
    });
  });

  describe('mergeConfigurations', () => {
    it('should merge domain config with user config', () => {
      const domainConfig = createDefaultGroupBySelectorConfig();
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
      const domainConfig = createDefaultGroupBySelectorConfig();
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
      const domainConfig = createDefaultGroupBySelectorConfig();
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
    it('should maintain consistent structure for traces domain', () => {
      const config = createDefaultGroupBySelectorConfig();
      const requiredKeys = [
        'attributePrefixes',
        'filteringRules',
        'ignoredAttributes',
        'layoutConfig',
        'searchConfig',
        'virtualizationConfig',
      ];

      requiredKeys.forEach(key => {
        expect(config).toHaveProperty(key);
      });
    });

    it('should have expected layout configuration', () => {
      const config = createDefaultGroupBySelectorConfig();

      expect(config.layoutConfig?.additionalWidthPerItem).toBe(40);
      expect(config.layoutConfig?.widthOfOtherAttributes).toBe(180);
      expect(config.layoutConfig?.enableResponsiveRadioButtons).toBe(true);
    });

    it('should have expected search configuration', () => {
      const config = createDefaultGroupBySelectorConfig();

      expect(config.searchConfig?.enabled).toBe(true);
      expect(config.searchConfig?.maxOptions).toBe(1000);
      expect(config.searchConfig?.caseSensitive).toBe(false);
      expect(config.searchConfig?.searchFields).toEqual(['label', 'value']);
    });

    it('should have expected virtualization configuration', () => {
      const config = createDefaultGroupBySelectorConfig();

      expect(config.virtualizationConfig?.enabled).toBe(true);
    });
  });
});
