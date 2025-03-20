import { DataQueryResponseData, Field } from '@grafana/data';

export function cloneDataFrame(frame: DataQueryResponseData): DataQueryResponseData {
  return {
    ...frame,
    fields: frame.fields.map((field: Field) => ({
      ...field,
      values: field.values,
    })),
  };
}
