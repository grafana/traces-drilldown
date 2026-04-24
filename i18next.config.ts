import { defineConfig } from 'i18next-cli';

export default defineConfig({
  "locales": [
    "en-US"
  ],
  "extract": {
    "input": [
      "src/**/*.{ts,tsx}"
    ],
    "output": "src/locales/{{language}}/{{namespace}}.json",
    "defaultNS": "grafana-exploretraces-app",
    "keySeparator": ".",
    "nsSeparator": false,
    "contextSeparator": "_",
    "functions": [
      "t",
      "*.t"
    ],
    "transComponents": [
      "Trans"
    ]
  },
  "types": {
    "input": [
      "src/locales/{{language}}/{{namespace}}.json"
    ],
    "output": "src/types/i18next.d.ts"
  }
});