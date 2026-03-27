import { FieldType } from '@grafana/data';
import { TableCellDisplayMode } from '@grafana/ui';

import { buildSelectQuery, decorateTraceTableFields, filterSpanListFields } from './ExceptionTraceResults';
import { createField, createFrame } from './testUtils';

describe('ExceptionTraceResults helpers', () => {
  describe('buildSelectQuery', () => {
    it('returns empty string when no attributes selected', () => {
      expect(buildSelectQuery([])).toBe('');
    });

    it('builds select query with attributes', () => {
      expect(buildSelectQuery(['foo', 'bar'])).toBe(' | select(foo,bar)');
    });
  });

  describe('filterSpanListFields', () => {
    it('filters hidden and nested fields', () => {
      const frame = createFrame([
        createField('traceName', ['name'], {}, FieldType.string, { custom: {} }),
        createField('nestedSetLeft', [1], {}, FieldType.number, { custom: {} }),
        createField('status', ['error'], {}, FieldType.string, { custom: {} }),
        createField('exception.message', ['boom'], {}, FieldType.string, { custom: {} }),
        createField('spanID', ['span-1'], {}, FieldType.string, { custom: {} }),
      ]);

      const result = filterSpanListFields(frame);
      expect(result.fields.map((f) => f.name)).toEqual(['traceName', 'spanID']);
    });
  });

  describe('decorateTraceTableFields', () => {
    it('sets custom cell options for traceName and hides spanID', () => {
      const frame = createFrame([
        createField('traceName', ['trace'], {}, FieldType.string, { custom: {} }),
        createField('traceIdHidden', ['trace-1'], {}, FieldType.string, { custom: {} }),
        createField('spanID', ['span-1'], {}, FieldType.string, { custom: {} }),
      ]);

      const result = decorateTraceTableFields(frame, {} as any);
      const nameField = result.fields.find((f) => f.name === 'traceName');
      const spanField = result.fields.find((f) => f.name === 'spanID');

      expect(nameField?.config?.custom?.cellOptions?.type).toBe(TableCellDisplayMode.Custom);
      expect(spanField?.config?.custom?.hideFrom).toEqual({ viz: true });
    });
  });
});

