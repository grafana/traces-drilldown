module.exports = {
  extends: ['./.config/.eslintrc'],
  rules: {
    'react-hooks/rules-of-hooks': 'off', // Temporarily disable the hooks rule
    'react-hooks/exhaustive-deps': 'warn',
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
};
