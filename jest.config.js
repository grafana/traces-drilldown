// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const { grafanaESModules, nodeModulesToTransform } = require('./.config/jest/utils');

// Add additional ES modules that need to be transformed
const additionalESModules = [
  ...grafanaESModules,
  'marked',
  'react-calendar',
  'get-user-locale',
  'memoize',
  'mimic-function',
  '@wojtekmaj/date-utils',
];

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),
  // Override transformIgnorePatterns to include additional ES modules
  transformIgnorePatterns: [nodeModulesToTransform(additionalESModules)],
  moduleNameMapper: {
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/.config/jest/mocks/fileMock.js', // Mock static file imports
    resetMocks: true,
    clearMocks: true,
    resetModules: true,
  },
};
