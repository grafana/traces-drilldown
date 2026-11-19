import React, { useState } from 'react';
import {
  type AdHocVariableFilter,
  dateMath,
  dateTime,
  type DataSourceInstanceListItem,
  type TimeRange,
} from '@grafana/data';
import { Trans } from '@grafana/i18n';
import { useDataSourceInstanceList } from '@grafana/runtime/unstable';

import { SuspendedEmbeddedTraceExceptions } from 'exposedComponents';

import type { AssistantExtensionManifest, InlineChitProps, InlineChitTurn } from '../extensionConfig';

/** Local suffix of `<grafana_exploretraces_app_exceptions />`. Saved replies already use this tag. */
const EXCEPTIONS_CHIT_NAME = 'exceptions';

const TEMPO_QUERY_TOOL = 'tempo_query_handler';
const DEFAULT_START = 'now-1h';
const DEFAULT_END = 'now';
const FILTER_OPERATORS = new Set(['=', '!=', '>', '<', '=~', '!~']);

const EXCEPTIONS_PROMPT = `When the user asks about trace exceptions, include this tag once:
<grafana_exploretraces_app_exceptions name="resource.service.name|=|checkout" />
name is space-separated key|operator|value filters, or '' for all services. Operators: = != =~ !~ > <.
The Tempo datasource and time range come from the query in this turn. Do not set them on the tag.
Write the tag as HTML, self-closing, and not inside backticks or a code fence. Use it only for trace exceptions.`;

interface TempoQueryFromTurn {
  datasourceUid?: string;
  start?: string;
  end?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(input: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = input?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

/** Latest `tempo_query_handler` call in this turn. Later calls win. */
export function tempoQueryFromTurn(turn: InlineChitTurn | undefined): TempoQueryFromTurn {
  const tools = turn?.tools ?? [];
  for (let index = tools.length - 1; index >= 0; index -= 1) {
    const call = tools[index];
    if (call.name !== TEMPO_QUERY_TOOL || !isRecord(call.input)) {
      continue;
    }

    const datasourceUid = stringField(call.input, 'datasource_uid');
    if (!datasourceUid) {
      continue;
    }

    const start = stringField(call.input, 'start');
    const end = stringField(call.input, 'end');
    return { datasourceUid, ...(start && { start }), ...(end && { end }) };
  }

  return {};
}

/** `name` is space-separated `key|operator|value` filters. Empty, or the host's boolean `true`, means all services. */
export function parseExceptionFilters(name: string | boolean | undefined): AdHocVariableFilter[] {
  if (typeof name !== 'string' || !name.trim()) {
    return [];
  }

  const filters: AdHocVariableFilter[] = [];
  for (const condition of name.trim().split(/\s+/)) {
    const parts = condition.split('|');
    if (parts.length !== 3) {
      continue;
    }
    const [key, operator, rawValue] = parts.map((part) => part.trim());
    if (!FILTER_OPERATORS.has(operator)) {
      continue;
    }
    filters.push({ key, operator, value: rawValue.replace(/"/g, '') });
  }
  return filters;
}

function buildTimeRange(start: string | undefined, end: string | undefined): TimeRange {
  const fromRaw = start ?? DEFAULT_START;
  const toRaw = end ?? DEFAULT_END;
  const from = dateMath.toDateTime(fromRaw, {});
  const to = dateMath.toDateTime(toRaw, { roundUp: true });
  if (from?.isValid() && to?.isValid()) {
    return { from, to, raw: { from: fromRaw, to: toRaw } };
  }

  const now = dateTime();
  return {
    from: dateTime(now).subtract(1, 'hour'),
    to: now,
    raw: { from: DEFAULT_START, to: DEFAULT_END },
  };
}

function defaultTempoUid(sources: DataSourceInstanceListItem[]): string | undefined {
  return (sources.find((source) => source.isDefault && source.uid) ?? sources.find((source) => source.uid))?.uid;
}

/**
 * Reply view for trace exceptions. The scene reads its props once, so the first
 * settled render is kept if the host marks the turn working again.
 */
export function TraceExceptionsReply({ name, turn }: InlineChitProps) {
  const { items, isLoading } = useDataSourceInstanceList({ type: 'tempo' });
  const query = tempoQueryFromTurn(turn);
  const ready = turn?.isStreaming !== true && (Boolean(query.datasourceUid) || !isLoading);
  const [view, setView] = useState<React.ReactElement | null>(null);

  if (view === null && ready) {
    setView(
      <SuspendedEmbeddedTraceExceptions
        initialTimeRange={buildTimeRange(query.start, query.end)}
        initialDS={query.datasourceUid ?? defaultTempoUid(items)}
        initialFilters={parseExceptionFilters(name)}
        embedderName="Assistant"
        returnToPreviousSource="Assistant"
      />
    );
  }

  return (
    view ?? (
      <div>
        <Trans i18nKey="exposed-components.loading">Loading...</Trans>
      </div>
    )
  );
}

export const assistantExtensionManifest: AssistantExtensionManifest = {
  schemaVersion: 1,
  chits: [
    {
      kind: 'inline',
      name: EXCEPTIONS_CHIT_NAME,
      component: TraceExceptionsReply,
      selfClosing: true,
      display: 'block',
      prompt: EXCEPTIONS_PROMPT,
    },
  ],
};
