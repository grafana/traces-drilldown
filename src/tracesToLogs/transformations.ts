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

function buildSpanLogsLink(target: TraceLogsTarget, traceId: string): DataLink | undefined {
  if (!target.ownsSpanLinks || !target.strategyId) {
    return undefined;
  }

  const strategy = getStrategy(target.strategyId);

  if (!strategy) {
    return undefined;
  }

  return {
    title: t('traces-to-logs.span-link-title', 'Logs for this span'),
    url: '',
    internal: {
      datasourceUid: target.datasourceUid,
      datasourceName: target.datasourceName,
      query: {
        refId: 'spanLogs',
        expr: strategy.buildSpanExpr(traceId),
        queryType: 'range',
      },
    },
  };
}

function attachSpanLogsLinks(frames: DataFrame[], target: TraceLogsTarget | undefined, traceId: string): DataFrame[] {
  const link = target ? buildSpanLogsLink(target, traceId) : undefined;

  if (!link) {
    return frames;
  }

  return frames.map((frame) => {
    const hasLinkField = frame.fields.some((field) => field.name === LINK_FIELD);
    const hasServiceName = frame.fields.some((field) => field.name === 'serviceName');

    // The span expressions are scoped by service, so a frame without a service name would produce
    // a query with an uninterpolated variable in it.
    if (!hasLinkField || !hasServiceName) {
      return frame;
    }

    return {
      ...frame,
      fields: frame.fields.map((field) =>
        field.name === LINK_FIELD
          ? { ...field, config: { ...field.config, links: [...(field.config.links ?? []), link] } }
          : field
      ),
    };
  });
}

/**
 * Adds a "Logs for this span" link to every span row once a logs target has been resolved.
 *
 * The link is injected into the data frame rather than by overriding the panel's `createSpanLink`
 * option, because that option replaces core's whole span link factory: trace to metrics, trace to
 * profiles, span references and session links would all disappear with it.
 *
 * `getTarget` is read at transform time, so the scene can resolve the target asynchronously and
 * then call `reprocessTransformations()`.
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
