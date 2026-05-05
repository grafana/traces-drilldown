import { SceneFlexItem, SceneFlexLayout } from '@grafana/scenes';

import { TabsBarScene } from './Tabs/TabsBarScene';
import { buildQuery, getActionViewPrefixLen } from './TracesByServiceScene';
import { ComparisonSelection } from '../../../utils/shared';

describe('TracesByServiceScene', () => {
  describe('getActionViewPrefixLen / setActionView slice contract', () => {
    it('prefix length is 2 when RED row is shown', () => {
      expect(getActionViewPrefixLen(false)).toBe(2);
      expect(getActionViewPrefixLen(undefined)).toBe(2);
    });

    it('prefix length is 1 when RED row is hidden', () => {
      expect(getActionViewPrefixLen(true)).toBe(1);
    });

    it('replaces only trailing tab scene: RED visible vs hideRedPanels', () => {
      const redRow = new SceneFlexLayout({ children: [] });
      const tabsWrap = new SceneFlexItem({ body: new TabsBarScene({}) });
      const oldScene = new SceneFlexLayout({ children: [] });
      const newScene = new SceneFlexLayout({ children: [] });

      const withRed = [redRow, tabsWrap, oldScene];
      const pFull = getActionViewPrefixLen(false);
      expect(withRed.length > pFull - 1).toBe(true);
      expect([...withRed.slice(0, pFull), newScene]).toEqual([redRow, tabsWrap, newScene]);

      const withoutRed = [tabsWrap, oldScene];
      const pHidden = getActionViewPrefixLen(true);
      expect(withoutRed.length > pHidden - 1).toBe(true);
      expect([...withoutRed.slice(0, pHidden), newScene]).toEqual([tabsWrap, newScene]);
    });

    it('does not swap when fewer children than required for prefix + tab', () => {
      const onlyTabs = new SceneFlexItem({ body: new TabsBarScene({}) });
      const pFull = getActionViewPrefixLen(false);
      expect([onlyTabs].length > pFull - 1).toBe(false);

      const empty: unknown[] = [];
      const pHidden = getActionViewPrefixLen(true);
      expect(empty.length > pHidden - 1).toBe(false);
    });
  });

  describe('buildQuery', () => {
    it('should build basic query with no selection', () => {
      const query = buildQuery('rate', '');
      expect(query).toEqual({
        refId: 'A',
        query: '{${filtersOrPrefix}${primarySignal} && ${filters}}',
        queryType: 'traceql',
        tableType: 'spans',
        limit: 200,
        spss: 10,
        filters: [],
      });
    });

    it('should add error status for error type', () => {
      const query = buildQuery('errors', '');
      expect(query.query).toBe('{${filtersOrPrefix}${primarySignal} && ${filters} && status = error}');
    });

    it('should add latency threshold for duration type with no selection', () => {
      const query = buildQuery('duration', '');
      expect(query.query).toBe('{${filtersOrPrefix}${primarySignal} && ${filters}&& duration > ${latencyThreshold}}');
    });

    it('should handle duration selection range', () => {
      const selection: ComparisonSelection = {
        type: 'manual',
        duration: {
          from: '100ms',
          to: '500ms',
        },
      };
      const query = buildQuery('duration', '', selection);
      expect(query.query).toBe('{${filtersOrPrefix}${primarySignal} && ${filters}&& duration >= 100ms && duration <= 500ms}');
    });

    it('should handle duration selection with only from', () => {
      const selection: ComparisonSelection = {
        type: 'manual',
        duration: {
          from: '100ms',
          to: '',
        },
      };
      const query = buildQuery('duration', '', selection);
      expect(query.query).toBe('{${filtersOrPrefix}${primarySignal} && ${filters}&& duration >= 100ms}');
    });

    it('should handle duration selection with only to', () => {
      const selection: ComparisonSelection = {
        type: 'manual',
        duration: {
          from: '',
          to: '500ms',
        },
      };
      const query = buildQuery('duration', '', selection);
      expect(query.query).toBe('{${filtersOrPrefix}${primarySignal} && ${filters}&& duration <= 500ms}');
    });

    it('should add select columns when provided', () => {
      const query = buildQuery('rate', 'duration,service.name');
      expect(query.query).toBe('{${filtersOrPrefix}${primarySignal} && ${filters}} | select(duration,service.name)');
    });
  });
});
