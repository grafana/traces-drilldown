import { DataFrame, Field } from '@grafana/data';

export const createField = (
  name: string,
  values: any[],
  labels: Record<string, string> = {},
  type: any = 'number',
  config: Record<string, any> = {}
) =>
  ({
    name,
    values,
    labels,
    type,
    config,
  }) as Field;

export const createFrame = (fields: Field[]): DataFrame =>
  ({
    fields,
    length: fields[0]?.values?.length ?? 0,
  }) as unknown as DataFrame;

