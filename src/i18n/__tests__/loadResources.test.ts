import { loadResources } from '../loadResources';

describe('loadResources', () => {
  describe('successful resource loading', () => {
    it('should load en-US resources when language is en-US', async () => {
      const result = await loadResources('en-US');

      expect(result).toMatchObject({
        app: {
          'page-title': 'Traces Drilldown',
        },
      });
    });

    it('should load en-US resources when language is undefined', async () => {
      const result = await loadResources('');

      expect(result).toMatchObject({
        app: {
          'page-title': 'Traces Drilldown',
        },
      });
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to en-US when requested language is not found', async () => {
      const result = await loadResources('fr-FR');

      expect(result).toMatchObject({
        app: {
          'page-title': 'Traces Drilldown',
        },
      });
    });
  });
});
