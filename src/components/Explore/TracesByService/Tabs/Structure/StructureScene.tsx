import React from 'react';

import {
  PanelBuilders,
  SceneComponentProps,
  SceneDataNode,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import {
  EMPTY_STATE_ERROR_MESSAGE,
  explorationDS,
  filterStreamingProgressTransformations,
  MetricFunction,
  VAR_FILTERS_EXPR,
  VAR_LATENCY_PARTIAL_THRESHOLD_EXPR,
  VAR_LATENCY_THRESHOLD_EXPR,
} from '../../../../../utils/shared';
import { TraceSearchMetadata } from '../../../../../types';
import { mergeTraces } from '../../../../../utils/trace-merge/merge';
import { createDataFrame, Field, FieldType, GrafanaTheme2, LinkModel, LoadingState } from '@grafana/data';
import { TreeNode } from '../../../../../utils/trace-merge/tree-node';
import { Icon, LinkButton, Stack, Text, useTheme2 } from '@grafana/ui';
import Skeleton from 'react-loading-skeleton';
import { EmptyState } from '../../../../states/EmptyState/EmptyState';
import { css } from '@emotion/css';
import { getOpenTrace, getTraceExplorationScene } from 'utils/utils';
import { structureDisplayName } from '../TabsBarScene';

export interface ServicesTabSceneState extends SceneObjectState {
  panel?: SceneFlexLayout;
  loading?: boolean;
  tree?: TreeNode;
  metric?: MetricFunction;
}

const ROOT_SPAN_ID = '0000000000000000';

export class StructureTabScene extends SceneObjectBase<ServicesTabSceneState> {  
  constructor(state: Partial<ServicesTabSceneState>) {
    super({
      $data: new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: explorationDS,
          queries: [buildQuery(state.metric as MetricFunction)],
        }),
        transformations: filterStreamingProgressTransformations,
      }),
      loading: true,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    this._subs.add(
      this.state.$data?.subscribeToState((state) => {
        if (state.data?.state === LoadingState.Loading || state.data?.state === LoadingState.Streaming) {
          this.setState({ loading: true });
          return;
        }
        
        if (state.data?.state === LoadingState.Done && state.data?.series.length) {
          const frame = state.data?.series[0].fields[0].values[0];
          if (frame) {
            const response = JSON.parse(frame) as TraceSearchMetadata[];
            const tree = mergeTraces(response);
            tree.children.sort((a, b) => countSpans(b) - countSpans(a));
                        
            this.setState({
              loading: false,
              tree,
              panel: new SceneFlexLayout({
                height: '100%',
                wrap: 'wrap',
                children: this.getPanels(tree),
              }),
            });
          }
        }
      })
    );
  }

  private getPanels(tree: TreeNode) {
    return tree.children.map((child) => {
      return new SceneFlexItem({
        height: 150,
        width: '100%',
        minHeight: '400px',
        body: this.getPanel(child),
      });
    });
  }

  private getPanel(tree: TreeNode) {
    const timeRange = sceneGraph.getTimeRange(this);
    const from = timeRange.state.value.from;
    const to = timeRange.state.value.to;

    const openTrace = getOpenTrace(this);

    return PanelBuilders.traces()
      .setTitle(`Structure for ${tree.serviceName} [${countSpans(tree)} spans used]`)
      .setOption('createFocusSpanLink' as any, (traceId: string, spanId: string): LinkModel<Field> => {
        return {
          title: 'Open trace',
          href: '#',
          onClick: () => openTrace(traceId, spanId),
          origin: {} as Field,
          target: '_self',
        };
      })
      .setData(
        new SceneDataNode({
          data: {
            state: LoadingState.Done,
            timeRange: {
              from,
              to,
              raw: { from, to },
            },
            series: [
              {
                ...this.buildData(tree),
              },
            ],
          },
        })
      )
      .build();
  }

  private buildData(tree: TreeNode) {
    const trace = this.getTrace(tree, ROOT_SPAN_ID);
    const traceName = trace[0].serviceName + ':' + trace[0].operationName;

    return createDataFrame({
      name: `Trace ${traceName}`,
      refId: `trace_${traceName}`,
      fields: [
        {
          name: 'references',
          type: FieldType.other,
          values: trace.map((x) => x.references),
        },
        {
          name: 'traceID',
          type: FieldType.string,
          values: trace.map((x) => x.traceID),
        },
        {
          name: 'spanID',
          type: FieldType.string,
          values: trace.map((x) => x.spanID),
        },
        {
          name: 'parentSpanID',
          type: FieldType.string,
          values: trace.map((x) => x.parentSpanId),
        },
        {
          name: 'serviceName',
          type: FieldType.string,
          values: trace.map((x) => x.serviceName),
        },
        {
          name: 'operationName',
          type: FieldType.string,
          values: trace.map((x) => x.operationName),
        },
        {
          name: 'duration',
          type: FieldType.number,
          values: trace.map((x) => x.duration),
        },
        {
          name: 'startTime',
          type: FieldType.number,
          values: trace.map((x) => x.startTime),
        },
        {
          name: 'statusCode',
          type: FieldType.number,
          values: trace.map((x) => x.statusCode),
        },
      ],
    });
  }

  private getTrace(node: TreeNode, spanID: string) {
    const erroredSpans = node.spans.reduce(
      (acc, c) => (c.attributes?.find((a) => a.key === 'status')?.value.stringValue === 'error' ? acc + 1 : acc),
      0
    );

    // start time needs to be different from zero otherwise for the root, otherwise the Trace View won't render it
    let startTime = 0.0001;
    if (spanID !== ROOT_SPAN_ID) {
      startTime =
        node.spans.reduce((acc, c) => acc + parseInt(c.startTimeUnixNano, 10), 0) / node.spans.length / 1000000;
    }

    const values = [
      {
        // Add last 5 spans of the list as external references
        // refType = 'EXTERNAL' doesn't mean anything, it's just to be different from CHILD_OF and FOLLOW_FROM
        references: node.spans.slice(-5).map((x) => ({
          refType: 'EXTERNAL',
          traceID: x.traceId,
          spanID: x.spanID,
        })),
        traceID: node.traceID,
        spanID: node.spans[0].spanID,
        parentSpanId: spanID,
        serviceName: node.serviceName,
        operationName: node.operationName,
        statusCode: erroredSpans > 0 ? 2 /*error*/ : 0 /*unset*/,
        duration: node.spans.reduce((acc, c) => acc + parseInt(c.durationNanos, 10), 0) / node.spans.length / 1000000,
        startTime,
      },
    ];

    for (const child of node.children) {
      values.push(...this.getTrace(child, node.spans[0].spanID));
    }
    return values;
  }

  public static Component = ({ model }: SceneComponentProps<StructureTabScene>) => {
    const { tree, loading, panel, $data } = model.useState();
    const styles = getStyles(useTheme2());
    const theme = useTheme2();

    const exploration = getTraceExplorationScene(model);
    const { value } = exploration.getMetricVariable().useState();

    const metric = value as MetricFunction;

    let isLoading = loading || !tree?.children.length;
    if ($data?.state.data?.state === LoadingState.Done) {
      isLoading = false;
    }

    let description;
    let emptyMsg = '';
    switch (metric) {
      case 'rate':
        description = (
          <>
            <div>Analyse the service structure of the traces that match the current filters.</div>
            <div>Each panel represents an aggregate view compiled using spans from multiple traces.</div>
          </>
        );
        emptyMsg = 'server';
        break;
      case 'errors':
        description = (
          <>
            <div>Analyse the errors structure of the traces that match the current filters.</div>
            <div>Each panel represents an aggregate view compiled using spans from multiple traces.</div>
          </>
        );
        emptyMsg = 'error';
        break;
      case 'duration':
        description = (
          <>
            <div>Analyse the structure of slow spans from the traces that match the current filters.</div>
            <div>Each panel represents an aggregate view compiled using spans from multiple traces.</div>
          </>
        );
        emptyMsg = 'slow';
        break;
    }

    const tabName = structureDisplayName(metric);

    const noDataMessage = (
      <>
        <Text textAlignment={'center'} variant="h3">
          {EMPTY_STATE_ERROR_MESSAGE}
        </Text>
        <Text textAlignment={'center'} variant="body">
          <div className={styles.longText}>
            The structure tab shows {emptyMsg} spans beneath what you are currently investigating. Currently, there are
            no descendant {emptyMsg} spans beneath the spans you are investigating.
          </div>
        </Text>
        <Stack gap={0.5} alignItems={'center'}>
          <Icon name="info-circle" />
          <Text textAlignment={'center'} variant="body">
            The structure tab works best with full traces.
          </Text>
        </Stack>

        <div className={styles.actionContainer}>
          Read more about
          <div className={styles.action}>
            <LinkButton
              icon="external-link-alt"
              fill="solid"
              size={'sm'}
              target={'_blank'}
              href={
                'https://grafana.com/docs/grafana/next/explore/simplified-exploration/traces/concepts/#trace-structure'
              }
            >
              {`${tabName.toLowerCase()}`}
            </LinkButton>
          </div>
        </div>
      </>
    );

    return (
      <Stack direction={'column'} gap={1}>
        <div className={styles.description}>{description}</div>
        {isLoading && (
          <Stack direction={'column'} gap={2}>
            <Skeleton
              count={4}
              height={200}
              baseColor={theme.colors.background.secondary}
              highlightColor={theme.colors.background.primary}
            />
          </Stack>
        )}

        {!isLoading && tree && tree.children.length > 0 && (
          <div className={styles.traceViewList}>{panel && <panel.Component model={panel} />}</div>
        )}

        {$data?.state.data?.state === LoadingState.Done && !tree?.children.length && (
          <EmptyState message={noDataMessage} padding={'32px'} />
        )}
      </Stack>
    );
  };
}

function buildQuery(metric: MetricFunction) {
  let metricQuery;
  let selectionQuery = '';
  switch (metric) {
    case 'errors':
      metricQuery = 'status = error';
      selectionQuery = 'status = error';
      break;
    case 'duration':
      metricQuery = `duration > ${VAR_LATENCY_PARTIAL_THRESHOLD_EXPR}`;
      selectionQuery = `duration > ${VAR_LATENCY_THRESHOLD_EXPR}`;
      break;
    default:
      metricQuery = 'kind = server';
      break;
  }

  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR} ${
      selectionQuery.length ? `&& ${selectionQuery}` : ''
    }} &>> { ${metricQuery} } | select(status, resource.service.name, name, nestedSetParent, nestedSetLeft, nestedSetRight)`,
    queryType: 'traceql',
    tableType: 'raw',
    limit: 200,
    spss: 20,
    filters: [],
  };
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    description: css({
      fontSize: theme.typography.h6.fontSize,
      padding: `${theme.spacing(1)} 0`,
    }),
    traceViewList: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.x1,
      // Hide the minimap and header components
      'div[class*="panel-content"] > div': {
        overflow: 'auto',
        '> :not([class*="TraceTimelineViewer"])': {
          display: 'none',
        },
      },
      // Hide the Span and Resource accordions from span details
      'div[data-testid="span-detail-component"] > :nth-child(4) > :nth-child(1)': {
        display: 'none',
      },

      // Hide span details row
      '.span-detail-row': {
        display: 'none',
      },

      // Remove cursor pointer as span details is hidden
      'div[data-testid="TimelineRowCell"]': {
        'button[role="switch"]': {
          cursor: 'text',
        },
      },
      'div[data-testid="span-view"]': {
        cursor: 'text !important',
      },
    }),
    longText: css({
      maxWidth: '800px',
      margin: '0 auto',
    }),
    action: css({
      marginLeft: theme.spacing(1),
    }),
    actionContainer: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }),
  };
};

function countSpans(tree: TreeNode) {
  let count = tree.spans.length;
  for (const child of tree.children) {
    count += countSpans(child);
  }
  return count;
}

export function buildStructureScene(metric: MetricFunction) {
  return new SceneFlexItem({
    body: new StructureTabScene({ metric }),
  });
}
