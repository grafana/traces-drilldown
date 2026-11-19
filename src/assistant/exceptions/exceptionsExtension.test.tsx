import type { DataSourceInstanceListItem } from '@grafana/data';
import { useDataSourceInstanceList } from '@grafana/runtime/unstable';
import { render, screen } from '@testing-library/react';
import React from 'react';

import type { EmbeddedTraceExceptionsState } from 'exposedComponents/types';

import {
  assistantExtensionManifest,
  parseExceptionFilters,
  tempoQueryFromTurn,
  TraceExceptionsReply,
} from './exceptionsExtension';
import { getAssistantExtensionConfig } from '../extensionConfig';

jest.mock('@grafana/runtime/unstable', () => ({
  useDataSourceInstanceList: jest.fn(),
}));

function mountedText(props: EmbeddedTraceExceptionsState) {
  const filters = props.initialFilters?.map((filter) => `${filter.key}${filter.operator}${filter.value}`).join(' ');
  const { from, to } = props.initialTimeRange.raw;
  return `${props.initialDS}|${String(from)}|${String(to)}|${filters ?? ''}|${props.embedderName}|${props.returnToPreviousSource}`;
}

jest.mock('exposedComponents', () => ({
  SuspendedEmbeddedTraceExceptions: jest.fn((props: EmbeddedTraceExceptionsState) => <div>{mountedText(props)}</div>),
}));

const tempoDatasources = [
  { uid: 'tempo-prod', name: 'tempo-dev-01', type: 'tempo', isDefault: true },
  { uid: 'tempo-other', name: 'tempo-staging', type: 'tempo', isDefault: false },
] as DataSourceInstanceListItem[];

const list = jest.mocked(useDataSourceInstanceList);

beforeEach(() => {
  list.mockReturnValue({ isLoading: false, items: tempoDatasources });
});

afterEach(() => {
  list.mockReset();
});

describe('TraceExceptionsReply', () => {
  it('mounts the exceptions view with the turn Tempo query and the tag filters', () => {
    render(
      <TraceExceptionsReply
        name="resource.service.name|=|checkout"
        turn={{
          isStreaming: false,
          tools: [
            {
              name: 'tempo_query_handler',
              input: {
                datasource_uid: 'grafanacloud-demoinfra-traces',
                start: '2026-11-10T08:00:00Z',
                end: '2026-11-10T09:00:00Z',
              },
            },
          ],
        }}
      />
    );

    expect(
      screen.getByText(
        'grafanacloud-demoinfra-traces|2026-11-10T08:00:00Z|2026-11-10T09:00:00Z|resource.service.name=checkout|Assistant|Assistant'
      )
    ).toBeInTheDocument();
  });

  it('uses all services, the default Tempo datasource and the last hour when the tag omits them', () => {
    render(<TraceExceptionsReply />);

    expect(screen.getByText('tempo-prod|now-1h|now||Assistant|Assistant')).toBeInTheDocument();
  });

  it('treats a boolean name from an empty attribute as all services', () => {
    render(<TraceExceptionsReply name />);

    expect(screen.getByText('tempo-prod|now-1h|now||Assistant|Assistant')).toBeInTheDocument();
  });

  it('uses the Tempo datasource from the turn instead of the stack default', () => {
    render(
      <TraceExceptionsReply
        name=""
        turn={{
          isStreaming: false,
          tools: [{ name: 'tempo_query_handler', input: { datasource_uid: 'grafanacloud-demoinfra-traces' } }],
        }}
      />
    );

    expect(screen.getByText(/grafanacloud-demoinfra-traces\|now-1h\|now/)).toBeInTheDocument();
    expect(screen.queryByText(/tempo-prod/)).not.toBeInTheDocument();
  });

  it('waits until streaming stops and a datasource is ready', () => {
    list.mockReturnValue({ isLoading: true, items: [] });

    const { rerender } = render(<TraceExceptionsReply name="" turn={{ isStreaming: true, tools: [] }} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText(/tempo-from-turn/)).not.toBeInTheDocument();

    list.mockReturnValue({ isLoading: false, items: tempoDatasources });
    rerender(
      <TraceExceptionsReply
        name=""
        turn={{
          isStreaming: false,
          tools: [{ name: 'tempo_query_handler', input: { datasource_uid: 'tempo-from-turn' } }],
        }}
      />
    );

    expect(screen.getByText(/tempo-from-turn\|now-1h\|now/)).toBeInTheDocument();
  });

  it('keeps the first scene when the turn is marked working again', () => {
    const { rerender } = render(
      <TraceExceptionsReply
        name="resource.service.name|=|checkout"
        turn={{
          isStreaming: false,
          tools: [{ name: 'tempo_query_handler', input: { datasource_uid: 'tempo-settled' } }],
        }}
      />
    );

    expect(screen.getByText(/resource.service.name=checkout/)).toBeInTheDocument();

    rerender(<TraceExceptionsReply name="resource.service.name|=|other" turn={{ isStreaming: true, tools: [] }} />);

    expect(screen.getByText(/resource.service.name=checkout/)).toBeInTheDocument();
    expect(screen.queryByText(/resource.service.name=other/)).not.toBeInTheDocument();
  });
});

describe('tempoQueryFromTurn', () => {
  it('reads the datasource and time range from the latest Tempo tool call', () => {
    expect(
      tempoQueryFromTurn({
        isStreaming: false,
        tools: [
          { name: 'prometheus_query_handler', input: { datasource_uid: 'grafanacloud-prom' } },
          {
            name: 'tempo_query_handler',
            input: {
              datasource_uid: 'grafanacloud-traces',
              start: '2026-11-10T08:00:00Z',
              end: '2026-11-10T09:00:00Z',
            },
          },
        ],
      })
    ).toEqual({
      datasourceUid: 'grafanacloud-traces',
      start: '2026-11-10T08:00:00Z',
      end: '2026-11-10T09:00:00Z',
    });
  });

  it('skips a Tempo call whose input is not a record and keeps the earlier one', () => {
    expect(
      tempoQueryFromTurn({
        isStreaming: false,
        tools: [
          { name: 'tempo_query_handler', input: { datasource_uid: 'older' } },
          { name: 'tempo_query_handler', input: 'not-an-object' },
        ],
      })
    ).toEqual({ datasourceUid: 'older' });
  });

  it('returns nothing when the host omits turn', () => {
    expect(tempoQueryFromTurn(undefined)).toEqual({});
  });
});

describe('parseExceptionFilters', () => {
  it('reads key, operator, and value, including comparison operators', () => {
    expect(parseExceptionFilters('span.http.status_code|>|499 resource.service.name|=|"checkout"')).toEqual([
      { key: 'span.http.status_code', operator: '>', value: '499' },
      { key: 'resource.service.name', operator: '=', value: 'checkout' },
    ]);
  });

  it('returns no filters for an empty name', () => {
    expect(parseExceptionFilters('')).toEqual([]);
    expect(parseExceptionFilters(undefined)).toEqual([]);
    // markdown-to-jsx converts name="" into boolean true.
    expect(parseExceptionFilters(true)).toEqual([]);
  });
});

describe('assistantExtensionManifest', () => {
  it('keeps the saved exceptions tag and asks for a block marker', () => {
    expect(assistantExtensionManifest.chits).toEqual([
      expect.objectContaining({
        kind: 'inline',
        name: 'exceptions',
        selfClosing: true,
        display: 'block',
        component: TraceExceptionsReply,
      }),
    ]);
    expect(assistantExtensionManifest.chits?.[0]).toEqual(
      expect.objectContaining({
        prompt: expect.stringContaining('<grafana_exploretraces_app_exceptions'),
      })
    );
  });

  it('registers the manifest on the Assistant extension point', () => {
    expect(getAssistantExtensionConfig(assistantExtensionManifest)).toEqual({
      title: 'assistant-extension',
      targets: ['grafana-assistant-app/extension/v1'],
      fn: expect.any(Function),
    });
    expect(getAssistantExtensionConfig(assistantExtensionManifest).fn()).toBe(assistantExtensionManifest);
  });
});
