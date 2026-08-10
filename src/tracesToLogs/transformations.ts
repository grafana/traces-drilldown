import { CustomTransformOperator, DataFrame, DataLink } from '@grafana/data';
import { t } from '@grafana/i18n';
import { getCorrelationsService } from '@grafana/runtime';
import { concatMap, map, Observable } from 'rxjs';

import { getStrategy } from './strategies';
import { TraceLogsTarget } from './types';

/**
 * Field the logs link is hung off. Every span row has one, and the trace panel collects links from
 * any field that carries them, so a single field is enough.
 */
const LINK_FIELD = 'spanID';

/** Also identifies our own link, so re-running the transformation cannot add it twice. */
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
    // Not "Logs for this span": Grafana hardcodes that label for the logs link built from the data
    // source configuration (SpanDetailLinkButtons.tsx), and two identically named entries in the
    // same menu would be indistinguishable.
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
 * Adds the span link to the frames in place, returning a new array only when something changed.
 *
 * Exported because the scene calls it directly on the frames it already holds, before the panel is
 * created. Re-emitting data after the trace view has rendered closes every open span detail, so the
 * links have to be in place for the first render.
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

    // The span expressions are scoped by service, so a frame without a service name would produce
    // a query with an uninterpolated variable in it.
    if (!linkField || !hasServiceName) {
      continue;
    }

    const existing = linkField.config.links ?? [];

    if (existing.some((candidate) => candidate.internal?.query?.refId === SPAN_LOGS_REF_ID)) {
      continue;
    }

    // The frame and field objects are updated in place on purpose. Grafana's trace view clears
    // every open span detail when the frame *identity* changes:
    //
    //   useEffect(() => setDetailStates(new Map()), [frame]) — useDetailState.ts
    //
    // Returning `{...frame}` here would therefore collapse whatever the user had open the moment
    // resolution finished. Only the wrapping array is new, which is enough for the panel to
    // recompute its span links.
    linkField.config = { ...linkField.config, links: [...existing, link] };
    attached = true;
  }

  return attached ? [...frames] : frames;
}

/**
 * Adds a trace-filtered logs link to every span row once a logs target has been resolved.
 *
 * The link is injected into the data frame rather than by overriding the panel's `createSpanLink`
 * option, because that option replaces core's whole span link factory: trace to metrics, trace to
 * profiles, span references and session links would all disappear with it.
 *
 * `getTarget` is read at transform time, so later query runs (a time range change, a refresh)
 * pick up an already resolved target without any extra work.
 */
export const addTraceLogsLinksTransformation =
  (getTarget: () => TraceLogsTarget | undefined, traceId: string): CustomTransformOperator =>
  () =>
  (source: Observable<DataFrame[]>) =>
    source.pipe(map((frames) => attachSpanLogsLinks(frames, getTarget(), traceId)));

/**
 * Renders Grafana Correlations defined on the Tempo data source as span links.
 *
 * Explore does this for free; a plugin scene has to ask for it. Without this, correlations, which
 * are provisionable by API and do not need data source edit rights, are invisible in this app.
 */
export const addCorrelationLinksTransformation =
  (getTempoDatasourceUid: () => string | undefined, refId: string): CustomTransformOperator =>
  () =>
  (source: Observable<DataFrame[]>) =>
    source.pipe(
      concatMap(async (frames) => {
        try {
          const service = getCorrelationsService?.();
          const tempoDatasourceUid = getTempoDatasourceUid();

          if (!service || !tempoDatasourceUid) {
            return frames;
          }

          const { correlations } = await service.getCorrelationsBySourceUIDs([tempoDatasourceUid]);

          if (!correlations.length) {
            return frames;
          }

          return service.attachCorrelationsToDataFrames(frames, correlations, { [refId]: tempoDatasourceUid });
        } catch (error) {
          console.warn('Failed to attach correlations to the trace', error);
          return frames;
        }
      })
    );
