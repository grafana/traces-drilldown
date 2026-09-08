import { DataSourceVariable } from '@grafana/scenes';

import { newTracesExploration } from '../../utils/utils';
import { VAR_DATASOURCE } from '../../utils/shared';
import { TraceExploration } from './TraceExploration';

jest.mock('@grafana/i18n', () => {
  const actual = jest.requireActual('@grafana/i18n');
  return {
    ...actual,
    t: (id: string, fallback: string, values?: Record<string, unknown>) => {
      if ((globalThis as { __tracesI18nNotReady?: boolean }).__tracesI18nNotReady) {
        throw new Error('t() was called before i18n was initialized');
      }
      return actual.t(id, fallback, values);
    },
  };
});

describe('TraceExploration i18n during construction', () => {
  afterEach(() => {
    delete (globalThis as { __tracesI18nNotReady?: boolean }).__tracesI18nNotReady;
  });

  it('throws for app and embedded scenes when t() runs before i18n init', () => {
    (globalThis as { __tracesI18nNotReady?: boolean }).__tracesI18nNotReady = true;

    expect(() => newTracesExploration('tempo')).toThrow('t() was called before i18n was initialized');
    expect(() => new TraceExploration({ embedded: true, initialDS: 'tempo' })).toThrow(
      't() was called before i18n was initialized'
    );
  });

  it('builds the non-embedded app scene after i18n init', () => {
    const exploration = newTracesExploration('tempo');
    const ds = exploration.state.$variables?.getByName(VAR_DATASOURCE) as DataSourceVariable | undefined;

    expect(exploration.state.embedded).toBeUndefined();
    expect(ds?.state.isReadOnly).toBeFalsy();
    expect(ds?.state.label).toBe('Data source');
  });

  it('builds the embedded scene after i18n init', () => {
    const exploration = new TraceExploration({ embedded: true, initialDS: 'tempo' });
    const ds = exploration.state.$variables?.getByName(VAR_DATASOURCE) as DataSourceVariable | undefined;

    expect(exploration.state.embedded).toBe(true);
    expect(ds?.state.isReadOnly).toBe(true);
    expect(ds?.state.label).toBe('Data source');
  });
});
