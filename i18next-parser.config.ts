import type { UserConfig } from 'i18next-parser';

const config: UserConfig = {
  contextSeparator: '_',
  createOldCatalogs: false,
  defaultNamespace: 'grafana-exploretraces-app',
  defaultValue: '',
  indentation: 2,
  keepRemoved: false,
  keySeparator: '.',
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JsxLexer'],
  },
  lineEnding: 'auto',
  locales: ['en-US', 'es-ES'],
  namespaceSeparator: false,
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  pluralSeparator: '_',
  input: ['src/**/*.{ts,tsx}'],
  sort: true,
  skipDefaultValues: false,
  useKeysAsDefaultValue: false,
  verbose: false,
  failOnWarnings: false,
  failOnUpdate: false,
  customValueTemplate: null,
  resetDefaultValueLocale: null,
  i18nextOptions: null,
};

export default config;
