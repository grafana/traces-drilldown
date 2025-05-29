import { Configuration, DefinePlugin } from 'webpack';
import { merge } from 'webpack-merge';
import packageJson from './package.json';
// @ts-ignore
import grafanaConfig from './.config/webpack/webpack.config';

// get git info from command line
let commitHash = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();

// @ts-ignore
const config = async (env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    plugins: [
      new DefinePlugin({
        'process.env.VERSION': JSON.stringify(packageJson.version),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        'process.env.COMMIT_SHA': JSON.stringify(commitHash || 'local'),
      }),
    ],
  });
};

export default config;
