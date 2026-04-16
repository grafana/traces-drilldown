import baseConfig from './.config/eslint.config.mjs';
import grafanaI18nPlugin from '@grafana/i18n/eslint-plugin';

/** @type {Array<import('eslint').Linter.Config>} */
export default [
  {
    ignores: ['dist/', 'node_modules/', '.config/', 'coverage/', '**/eslint.config.*'],
  },
  ...baseConfig,
  {
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
    plugins: { '@grafana/i18n': grafanaI18nPlugin },
    rules: {
      '@grafana/i18n/no-untranslated-strings': ['warn', { calleesToIgnore: ['^css$', 'use[A-Z].*'] }],
      '@grafana/i18n/no-translation-top-level': 'error',
    },
  },
];
