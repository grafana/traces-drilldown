import baseConfig from './.config/eslint.config.mjs';

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
];
