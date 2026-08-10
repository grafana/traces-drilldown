import { CustomTransformOperator, DataFrame, DataLink } from '@grafana/data';
import { t } from '@grafana/i18n';
import { map, Observable } from 'rxjs';

import { getStrategy } from './strategies';
import { TraceLogsTarget } from './types';

/** The trace panel collects links from any field that carries them, so one field is enough. */
const LINK_FIELD = 'spanID';

/** Also identifies our own link, so the transformation cannot add it twice. */
const SPAN_LOGS_REF_ID = 'spanLogs';

function buildSpanLogsLink(target: TraceLogsTarget, traceId: string): DataLink | undefined {
  if (!target.ownsSpanLinks || !target.strategyId) {
    return undefined;
  }

  const strategy = getStrategy(target.strategyId);

  if (!strategy) {
    return undefined;
  }

  return {
    // Not "Logs for this span": core hardcodes that for the config-built link
    // (SpanDetailLinkButtons.tsx), and two identically named menu entries are indistinguishable.
    title: t('traces-to-logs.span-link-title', 'Trace-filtered logs'),
    url: '',
    internal: {
      datasourceUid: target.datasourceUid,
      datasourceName: target.datasourceName,
      query: {
        refId: SPAN_LOGS_REF_ID,
        expr: strategy.buildSpanExpr(traceId),
        queryType: 'range',
      },
    },
  };
}

/**
 * Adds the span link in place, returning a new array only when something changed. The scene calls
 * this directly before the panel exists, because re-emitting data closes every open span detail.
 */
export function attachSpanLogsLinks(
  frames: DataFrame[],
  target: TraceLogsTarget | undefined,
  traceId: string
): DataFrame[] {
  const link = target ? buildSpanLogsLink(target, traceId) : undefined;

  if (!link) {
    return frames;
  }

  let attached = false;

  for (const frame of frames) {
    const linkField = frame.fields.find((field) => field.name === LINK_FIELD);
    const hasServiceName = frame.fields.some((field) => field.name === 'serviceName');

    // Without a service name the query would carry an uninterpolated variable.
    if (!linkField || !hasServiceName) {
      continue;
    }

    const existing = linkField.config.links ?? [];

    if (existing.some((candidate) => candidate.internal?.query?.refId === SPAN_LOGS_REF_ID)) {
      continue;
    }

    // In place on purpose: core clears every open span detail when the frame identity changes
    // (`useEffect(() => setDetailStates(new Map()), [frame])` in useDetailState.ts). Only the
    // wrapping array is new, which is enough for the panel to recompute its span links.
    linkField.config = { ...linkField.config, links: [...existing, link] };
    attached = true;
  }

  return attached ? [...frames] : frames;
}

/**
 * Injected into the data frame rather than via the panel's `createSpanLink` option, because that
 * option replaces core's whole factory: trace to metrics, profiles, span references and session
 * links would all disappear. `getTarget` is read at transform time so later query runs pick it up.
 */
export const addTraceLogsLinksTransformation =
  (getTarget: () => TraceLogsTarget | undefined, traceId: string): CustomTransformOperator =>
  () =>
  (source: Observable<DataFrame[]>) =>
    source.pipe(map((frames) => attachSpanLogsLinks(frames, getTarget(), traceId)));
