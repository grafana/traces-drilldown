import type { PluginExtensionAddedFunctionConfig } from '@grafana/data';
import type { ComponentType, ReactNode } from 'react';

/** Same target `getAssistantExtensionConfig` registers in `@grafana/assistant`. */
export const ASSISTANT_EXTENSION_POINT = 'grafana-assistant-app/extension/v1';
const ASSISTANT_EXTENSION_TITLE = 'assistant-extension';

export interface InlineChitToolCall {
  readonly toolCallId?: string;
  readonly name: string;
  readonly input: unknown;
}

export interface InlineChitTurn {
  readonly isStreaming: boolean;
  readonly tools: readonly InlineChitToolCall[];
}

export interface InlineChitProps {
  children?: ReactNode;
  /** Absent on older hosts. */
  turn?: InlineChitTurn;
  /** An empty `name=""` arrives as boolean `true`. */
  name?: string | boolean;
}

export interface InlineChitContribution {
  kind: 'inline';
  /** Plugin-local tag suffix. The host prefixes the plugin id. */
  name: string;
  prompt?: string;
  selfClosing?: boolean;
  /** Block requires selfClosing and renders below the message text. */
  display?: 'inline' | 'block';
  component: ComponentType<InlineChitProps>;
}

export interface AssistantExtensionManifest {
  schemaVersion: 1;
  chits?: InlineChitContribution[];
}

/**
 * Same shape as `@grafana/assistant`'s `getAssistantExtensionConfig`.
 * Kept local until that package is old enough to add as a dependency.
 */
export function getAssistantExtensionConfig(
  manifest: AssistantExtensionManifest
): PluginExtensionAddedFunctionConfig<() => AssistantExtensionManifest> {
  return {
    title: ASSISTANT_EXTENSION_TITLE,
    targets: [ASSISTANT_EXTENSION_POINT],
    fn: () => manifest,
  };
}
