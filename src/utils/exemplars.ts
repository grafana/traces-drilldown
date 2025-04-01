import { map, Observable } from 'rxjs';
import { DataFrame, DataTopic, Field } from '@grafana/data';
import { CustomTransformerDefinition } from '@grafana/scenes';
import { LocationService } from '@grafana/runtime';

export const exemplarsTransformations = (locationService: LocationService): CustomTransformerDefinition[] => [
  {
    topic: DataTopic.Annotations,
    operator: () => (source: Observable<DataFrame[]>) => {
      return source.pipe(
        map((data: DataFrame[]) => {
          return data.map((frame) => {
            if (frame.name === 'exemplar') {
              const traceIDField = frame.fields.find((field: Field) => field.name === 'traceId');
              const valueField = frame.fields.find((field: Field) => field.name === 'Value');
              
              if (traceIDField && valueField && traceIDField.values && valueField.values) {
                const validIndices: number[] = [];
                
                for (let i = 0; i < traceIDField.values.length; i++) {
                  const traceId = traceIDField.values[i];
                  const value = valueField.values[i];
                  
                  // A row is valid if:
                  // 1. The traceId is not null/undefined
                  // 2. The value is not null/undefined
                  // 3. The value is not 0
                  const isTraceIdValid = traceId != null && traceId !== '';
                  const isValueValid = value != null && value !== 0;
                  
                  if (isTraceIdValid && isValueValid) {
                    validIndices.push(i);
                  }
                }
                
                // If we filtered any rows, create a new frame
                // and filter each field's values to keep only valid rows
                if (validIndices.length < traceIDField.values.length) {
                  frame.fields.forEach(field => {
                    field.values = validIndices.map(i => field.values[i]);
                  });
                  frame.length = validIndices.length;
                }
              }
              
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
                      locationService.partial({
                        traceId,
                      });
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
