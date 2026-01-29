import React, { useMemo } from 'react';

import { DataFrame } from '@grafana/data';
import { TableCellDisplayMode, TableCustomCellOptions } from '@grafana/ui';
import { PanelBuilders, sceneGraph, SceneDataTransformer, SceneObject, SceneQueryRunner } from '@grafana/scenes';
import { map, Observable } from 'rxjs';

import { filterStreamingProgressTransformations, EventTraceOpened } from 'utils/shared';
import { getDatasourceUidOrThrow } from '../ExceptionUtils';

export const ExceptionTraceResults = ({
  selectedAttributes,
  baseFilter,
  scene,
}: {
  selectedAttributes: string[];
  baseFilter: string;
  scene: SceneObject;
}) => {
  const panel = useMemo(() => {
    const timeRange = sceneGraph.getTimeRange(scene);
    const datasourceUid = getDatasourceUidOrThrow(scene);
    const selectQuery = buildSelectQuery(selectedAttributes);

    const queryRunner = new SceneQueryRunner({
      datasource: { uid: datasourceUid },
      $timeRange: timeRange,
      queries: [
        {
          refId: 'A',
          query: baseFilter + selectQuery,
          queryType: 'traceql',
          tableType: 'spans',
          limit: 100,
          spss: 10,
          filters: [],
        },
      ],
    });

    const spanListTransformations = [
      () => (source: Observable<DataFrame[]>) => {
        return source.pipe(
          map((data: DataFrame[]) => data.map(filterSpanListFields))
        );
      },
      {
        id: 'organize',
        options: {
          indexByName: {
            'Trace Name': 0,
            'Trace Service': 1,
            'exception.type': 2,
            'Start time': 3,
            Duration: 4,
          },
        },
      },
      () => (source: Observable<DataFrame[]>) => {
        return source.pipe(
          map((data: DataFrame[]) => data.map((df) => decorateTraceTableFields(df, scene)))
        );
      },
    ];

    const dataTransformer = new SceneDataTransformer({
      $data: queryRunner,
      transformations: [...filterStreamingProgressTransformations, ...spanListTransformations],
    });

    return PanelBuilders.table()
      .setHoverHeader(true)
      .setData(dataTransformer)
      .build();
  }, [baseFilter, selectedAttributes, scene]);

  return <panel.Component model={panel} />;
};

export function buildSelectQuery(selectedAttributes: string[]) {
  return selectedAttributes.length ? ` | select(${selectedAttributes.join(',')})` : '';
}

export function filterSpanListFields(df: DataFrame) {
  return {
    ...df,
    fields: df.fields.filter((f) => !f.name.startsWith('nestedSet') && f.name !== 'status' && f.name !== 'exception.message'),
  };
}

// Open the drawer on click (same behavior as errored traces table)
export function decorateTraceTableFields(df: DataFrame, scene: SceneObject) {
  const fields = df.fields;
  const nameField = fields.find((f) => f.name === 'traceName');

  const options: TableCustomCellOptions = {
    type: TableCellDisplayMode.Custom,
    cellComponent: (props) => {
      const frame = props.frame;
      const traceIdField = frame?.fields.find((f) => f.name === 'traceIdHidden');
      const spanIdField = frame?.fields.find((f) => f.name === 'spanID');
      const traceId = traceIdField?.values[props.rowIndex];
      const spanId = spanIdField?.values[props.rowIndex];

      if (!traceId) {
        return props.value as string;
      }

      const name = props.value ? (props.value as string) : '<name not yet available>';
      return (
        <div className={'cell-link-wrapper'}>
          <div
            className={'cell-link'}
            title={name}
            onClick={() => {
              // Bubble to the root scene so the TraceDrawer opens
              (scene as SceneObject).publishEvent?.(new EventTraceOpened({ traceId, spanId }), true);
            }}
          >
            {name}
          </div>
        </div>
      );
    },
  };

  if (nameField?.config?.custom) {
    nameField.config.custom.cellOptions = options;
  }

  const spanIDField = fields.find((f) => f.name === 'spanID');
  if (spanIDField?.config?.custom) {
    spanIDField.config.custom.hideFrom = { viz: true };
  }

  return { ...df, fields };
}
