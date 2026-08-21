import { expect, test } from '@grafana/plugin-e2e';
import type { APIRequestContext, Page } from '@playwright/test';

import pluginJson from '../src/plugin.json';

/**
 * Covers the layered trace to logs resolution end to end against the devenv, which emits traces
 * with matching logs in several shapes plus one flavour with no logs at all.
 * See devenv/trace-log-generator/generate.py.
 */

const LOKI_URL = process.env.LOKI_URL ?? 'http://localhost:3100';
const TEMPO_URL = process.env.TEMPO_URL ?? 'http://localhost:3200';

const LOGS_FOR_TRACE = 'Logs for this trace';

function lastFifteenMinutesNs() {
  const nowMs = Date.now();

  return {
    start: String((nowMs - 15 * 60 * 1000) * 1_000_000),
    end: String((nowMs + 60 * 1000) * 1_000_000),
  };
}

/**
 * The generator writes a trace every couple of seconds, but on a cold stack there may be nothing
 * yet, so poll rather than assume.
 */
async function pollForTraceId(
  description: string,
  lookup: () => Promise<string | undefined>,
  timeoutMs = 90_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let traceId: string | undefined;

  while (Date.now() < deadline) {
    traceId = await lookup();

    if (traceId) {
      return traceId;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Timed out waiting for the devenv generator to produce ${description}`);
}

/** A trace id the generator has written logs for, taken from the log stream itself. */
function traceIdWithLogs(request: APIRequestContext): Promise<string> {
  return pollForTraceId('a trace with correlated logs', async () => {
    const { start, end } = lastFifteenMinutesNs();
    const response = await request.get(`${LOKI_URL}/loki/api/v1/query_range`, {
      params: {
        query: '{service_name="checkout"} | trace_id!=""',
        start,
        end,
        limit: 1,
        direction: 'backward',
      },
    });

    if (!response.ok()) {
      return undefined;
    }

    const body = await response.json();

    return body?.data?.result?.[0]?.stream?.trace_id;
  });
}

/** A trace id from the flavour that deliberately writes no logs. */
function traceIdWithoutLogs(request: APIRequestContext): Promise<string> {
  return pollForTraceId('a trace without logs', async () => {
    const response = await request.get(`${TEMPO_URL}/api/search`, {
      params: {
        q: '{resource.service.name="ghost-service"}',
        limit: 1,
        start: Math.floor(Date.now() / 1000) - 15 * 60,
        end: Math.floor(Date.now() / 1000) + 60,
      },
    });

    if (!response.ok()) {
      return undefined;
    }

    const body = await response.json();

    return body?.traces?.[0]?.traceID;
  });
}

async function openTrace(page: Page, traceId: string) {
  await page.goto(`/a/${pluginJson.id}/explore?traceId=${traceId}&from=now-30m&to=now`);
  // The drawer renders the traces panel once the trace has loaded.
  await expect(page.getByText(traceId.slice(0, 8), { exact: false }).first()).toBeVisible({ timeout: 30000 });
}

test.describe('trace to logs', () => {
  test('offers the trace wide logs action when logs exist for the trace', async ({ page, request }) => {
    const traceId = await traceIdWithLogs(request);

    await openTrace(page, traceId);

    const action = page.getByRole('link', { name: LOGS_FOR_TRACE });

    await expect(action).toBeVisible({ timeout: 30000 });
    await expect(action).toHaveAttribute('href', /loki|logs/i);
  });

  test('disables the action when the trace has no logs, rather than offering a dead link', async ({
    page,
    request,
  }) => {
    const traceId = await traceIdWithoutLogs(request);

    await openTrace(page, traceId);

    const disabledAction = page.getByRole('button', { name: LOGS_FOR_TRACE, disabled: true });

    await expect(disabledAction).toBeVisible({ timeout: 30000 });
    // Never a link, so it cannot be followed to an empty result.
    await expect(page.getByRole('link', { name: LOGS_FOR_TRACE })).toHaveCount(0);
  });
});
