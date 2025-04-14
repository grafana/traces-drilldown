import { map, Observable } from 'rxjs';
import { DataFrame, DataTopic, Field } from '@grafana/data';
import { CustomTransformerDefinition } from '@grafana/scenes';

export const exemplarsTransformations = (
  openTrace?: (traceId: string, spanId?: string) => void
): CustomTransformerDefinition[] => [
  {
    topic: DataTopic.Annotations,
    operator: () => (source: Observable<DataFrame[]>) => {
      return source.pipe(
        map((data: DataFrame[]) => {
          return data.map((frame) => {
            if (frame.name === 'exemplar') {
              const traceIDField = frame.fields.find((field: Field) => field.name === 'traceId');
              if (traceIDField) {
                // The traceID will be interpolated in the url
                // Then, onClick we retrieve the traceId from the url and navigate to the trace exploration scene by setting the state
                traceIDField.config.links = [
                  {
                    title: 'View trace',
                    url: '#${__value.raw}',
                    onClick: (event) => {
                      event.e.stopPropagation(); // Prevent the click event from propagating to the parent anchor
                      const parentAnchorHref = event.e.target?.parentElement?.parentElement?.href;
                      if (!parentAnchorHref || parentAnchorHref.indexOf('#') === -1) {
                        return;
                      }
                      const traceId = parentAnchorHref.split('#')[1];
                      if (!traceId || traceId === '') {
                        return;
                      }
                      openTrace?.(traceId);
                    },
                  },
                ];
              }
            }

            return frame;
          });
        })
      );
    },
  },
];

export const removeExemplarsTransformation = (): CustomTransformerDefinition[] => [
  {
    topic: DataTopic.Annotations,
    operator: () => (source: Observable<DataFrame[]>) => {
      return source.pipe(
        map((data: DataFrame[]) => {
          return data.filter((frame) => frame.name !== 'exemplar');
        })
      );
    },
  },
];

