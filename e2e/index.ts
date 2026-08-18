import { tracesExplorePage } from './fixtures/tracesExplore';
import { TracesExploreFixture } from './types';
import { PluginOptions, test as baseTest, expect as baseExpect } from '@grafana/plugin-e2e';

export const test = baseTest.extend<TracesExploreFixture, PluginOptions>({ tracesExplorePage });
export const expect = baseExpect.extend({});
