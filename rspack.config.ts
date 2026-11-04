import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { DefinePlugin, type Configuration } from '@rspack/core';
import { merge } from 'rspack-merge';

import grafanaConfig, { type Env } from './.config/rspack/rspack.config.ts';
import packageJson from './package.json' with { type: 'json' };

const commitHash = execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();

const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    resolve: {
      alias: {
        // Ensure single instance when using pnpm to prevent i18n state duplication
        '@grafana/i18n': path.resolve(import.meta.dirname, 'node_modules/@grafana/i18n'),
      },
    },
    plugins: [
      new DefinePlugin({
        'process.env.VERSION': JSON.stringify(packageJson.version),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        'process.env.COMMIT_SHA': JSON.stringify(commitHash || 'local'),
      }),
    ],
    stats: {
      assets: true,
      chunks: true,
      chunkModules: true,
      nestedModules: true,
      entrypoints: true,
    },
  });
};

export default config;
