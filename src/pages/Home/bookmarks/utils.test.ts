import { 
  getBookmarks, 
  bookmarkExists, 
  getBookmarkParams, 
  getBookmarkFromURL, 
  toggleBookmark,
  removeBookmark,
  getBookmarkForUrl,
  areBookmarksEqual
} from './utils';
import { ACTION_VIEW, PRIMARY_SIGNAL, BOOKMARKS_LS_KEY, EXPLORATIONS_ROUTE, VAR_DATASOURCE, VAR_FILTERS, VAR_GROUPBY, VAR_METRIC, SELECTION, VAR_LATENCY_THRESHOLD, VAR_LATENCY_PARTIAL_THRESHOLD } from 'utils/shared';

describe('Bookmark Utils', () => {
  const sampleBookmark = {
    params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
  };

  let localStorageMock: { [key: string]: string } = {};
  beforeEach(() => {
    localStorageMock = {};
    Storage.prototype.getItem = jest.fn((key) => localStorageMock[key] || null);
    Storage.prototype.setItem = jest.fn((key, value) => {
      localStorageMock[key] = value.toString();
    });
  });

  describe('getBookmarks', () => {
    it('should return empty array when localStorage is empty', () => {
      const bookmarks = getBookmarks();
      expect(bookmarks).toEqual([]);
      expect(localStorage.getItem).toHaveBeenCalledWith(BOOKMARKS_LS_KEY);
    });

    it('should return bookmarks from localStorage', () => {
      const bookmarksData = [sampleBookmark];
      localStorageMock[BOOKMARKS_LS_KEY] = JSON.stringify(bookmarksData);
      
      const bookmarks = getBookmarks();
      expect(bookmarks).toEqual(bookmarksData);
    });
  });

  describe('getBookmarkParams', () => {
    it('should extract parameters from a bookmark', () => {
      const params = getBookmarkParams(sampleBookmark);
      expect(params).toEqual({
        actionView: 'breakdown',
        primarySignal: 'full_traces',
        filters: 'filter1|=|value1',
        metric: 'rate'
      });
    });

    it('should handle empty bookmark values', () => {
      const emptyBookmark = {
        params: `${ACTION_VIEW}=&${PRIMARY_SIGNAL}=&$var-${VAR_DATASOURCE}=&var-${VAR_FILTERS}=&var-${VAR_GROUPBY}=&var-${VAR_METRIC}=`
      };
      
      const params = getBookmarkParams(emptyBookmark);
      expect(params).toEqual({
        actionView: '',
        primarySignal: '',
        filters: '',
        metric: ''
      });
    });
  });

  describe('getBookmarkFromURL', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...originalLocation,
          search: ''
        }
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation
      });
    });
    it('should create a bookmark from URL parameters', () => {
      window.location.search = `?${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`;
      
      const bookmark = getBookmarkFromURL();
      expect(bookmark).toEqual({
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1%7C%3D%7Cvalue1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      });
    });

    it('should handle empty URL parameters', () => {
      window.location.search = '';
      
      const bookmark = getBookmarkFromURL();
      expect(bookmark).toEqual({
        params: ''
      });
    });
  });

  describe('getBookmarkForUrl', () => {
    it('should generate a URL with all parameters', () => {
      const bookmark = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-ds=EBorgLFZ&var-${VAR_FILTERS}=filter1%7C%3D%7Cvalue1&var-groupBy=name&var-metric=rate`);
    });

    it('should handle multiple filters correctly', () => {
      const bookmark = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_FILTERS}=filter2|=|value2&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-ds=EBorgLFZ&var-${VAR_FILTERS}=filter1%7C%3D%7Cvalue1&var-${VAR_FILTERS}=filter2%7C%3D%7Cvalue2&var-groupBy=name&var-metric=rate`);
    });

    it('should handle a bookmark with no filters', () => {
      const bookmark = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-ds=EBorgLFZ&var-groupBy=name&var-metric=rate`);
    });

    it('should handle empty parameters', () => {
      const bookmark = {
        params: `${ACTION_VIEW}=&${PRIMARY_SIGNAL}=&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_GROUPBY}=&var-${VAR_METRIC}=`
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=&primarySignal=&var-ds=EBorgLFZ&var-groupBy=&var-metric=`);
    });
  });

  describe('addBookmark', () => {
    const originalLocation = window.location;
    
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...originalLocation,
          search: `?${ACTION_VIEW}=structure&${PRIMARY_SIGNAL}=full_traces`
        }
      });
      
      localStorageMock = {};
    });
    
    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation
      });
    });
    
    it('should add a bookmark to localStorage', () => {
      toggleBookmark();
      
      const storedData = JSON.parse(localStorageMock[BOOKMARKS_LS_KEY] || '[]');
      expect(storedData.length).toBe(1);
      expect(storedData[0].params).toBe('actionView=structure&primarySignal=full_traces');
    });
    
    it('should add a bookmark to an existing list in localStorage', () => {
      // Add an initial bookmark
      localStorageMock[BOOKMARKS_LS_KEY] = JSON.stringify([{ params: 'actionView=breakdown&primarySignal=full_traces' }]);
      
      // Add a new bookmark with different parameters
      window.location.search = `?${ACTION_VIEW}=structure&${PRIMARY_SIGNAL}=full_traces`;
      toggleBookmark();
      
      const storedData = JSON.parse(localStorageMock[BOOKMARKS_LS_KEY] || '[]');
      expect(storedData.length).toBe(2);
      expect(storedData[0].params).toBe('actionView=breakdown&primarySignal=full_traces');
      expect(storedData[1].params).toBe('actionView=structure&primarySignal=full_traces');
    });
    
    it('should not add duplicate bookmarks', () => {
      toggleBookmark();
      
      // Try to add the same bookmark again
      toggleBookmark();
      
      // The second call should remove the bookmark instead of adding a duplicate
      const storedData = JSON.parse(localStorageMock[BOOKMARKS_LS_KEY] || '[]');
      expect(storedData.length).toBe(0);
    });
  });

  describe('toggleBookmark', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...originalLocation,
          search: `?${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces`
        }
      });

      localStorageMock = {};
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation
      });
    });

    it('should add bookmark when it does not exist', () => {
      toggleBookmark();
      
      const storedData = JSON.parse(localStorageMock[BOOKMARKS_LS_KEY] || '[]');
      expect(storedData.length).toBe(1);
      expect(storedData[0].params).toBe('actionView=breakdown&primarySignal=full_traces');
    });

    it('should remove bookmark when it exists', () => {
      toggleBookmark();
      
      // Toggle bookmark again to remove
      toggleBookmark();
      
      const storedData = JSON.parse(localStorageMock[BOOKMARKS_LS_KEY] || '[]');
      expect(storedData.length).toBe(0);
    });
  });

  describe('removeBookmark', () => {
    it('should remove a bookmark', () => {
      localStorageMock[BOOKMARKS_LS_KEY] = JSON.stringify([sampleBookmark]);
      
      removeBookmark(sampleBookmark);
      
      const storedData = JSON.parse(localStorageMock[BOOKMARKS_LS_KEY] || '[]');
      expect(storedData.length).toBe(0);
    });

    it('should not change localStorage when bookmark does not exist', () => {
      const differentBookmark = {
        params: `${ACTION_VIEW}=differentView&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };
      
      // Add a bookmark to localStorage
      localStorageMock[BOOKMARKS_LS_KEY] = JSON.stringify([sampleBookmark]);
      
      // Try to remove a different bookmark
      removeBookmark(differentBookmark);
      
      const storedData = JSON.parse(localStorageMock[BOOKMARKS_LS_KEY] || '[]');
      expect(storedData.length).toBe(1);
      expect(storedData[0]).toEqual(sampleBookmark);
    });
  });

  describe('bookmarkExists', () => {
    it('should return undefined when bookmark does not exist', () => {
      const result = bookmarkExists(sampleBookmark);
      expect(result).toBeUndefined();
    });

    it('should return the bookmark when it exists', () => {
      const bookmarksData = [sampleBookmark];
      localStorageMock[BOOKMARKS_LS_KEY] = JSON.stringify(bookmarksData);
      
      const result = bookmarkExists(sampleBookmark);
      expect(result).toEqual(sampleBookmark);
    });
  });

  describe('areBookmarksEqual', () => {
    it('should return true for identical bookmarks', () => {
      const bookmark1 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };
      
      const bookmark2 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };
      
      expect(areBookmarksEqual(bookmark1, bookmark2)).toBe(true);
    });

    it('should return false for bookmarks with different action views', () => {
      const bookmark1 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      const bookmark2 = {
        params: `${ACTION_VIEW}=structure&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      expect(areBookmarksEqual(bookmark1, bookmark2)).toBe(false);
    });

    it('should return false for bookmarks with different primary signals', () => {
      const bookmark1 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      const bookmark2 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=partial_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      expect(areBookmarksEqual(bookmark1, bookmark2)).toBe(false);
    });

    it('should return false for bookmarks with different filters', () => {
      const bookmark1 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      const bookmark2 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter2|=|value2`
      };
      
      expect(areBookmarksEqual(bookmark1, bookmark2)).toBe(false);
    });

    it('should return true for bookmarks with the same filters in different order', () => {
      const bookmark1 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_FILTERS}=filter2|=|value2`
      };
      
      const bookmark2 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter2|=|value2&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      expect(areBookmarksEqual(bookmark1, bookmark2)).toBe(true);
    });

    it('should return false for bookmarks with different numbers of filters', () => {
      const bookmark1 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_FILTERS}=filter2|=|value2`
      };
      
      const bookmark2 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      expect(areBookmarksEqual(bookmark1, bookmark2)).toBe(false);
    });

    it('should handle bookmarks with selection, latency threshold, and latency partial threshold parameters', () => {
      const bookmark1 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&${SELECTION}=someValue&var-${VAR_LATENCY_THRESHOLD}=100&var-${VAR_LATENCY_PARTIAL_THRESHOLD}=50&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      const bookmark2 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&${SELECTION}=differentValue&var-${VAR_LATENCY_THRESHOLD}=200&var-${VAR_LATENCY_PARTIAL_THRESHOLD}=75&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      expect(areBookmarksEqual(bookmark1, bookmark2)).toBe(true);
    });

    it('should return false when one bookmark has more parameters than the other', () => {
      const bookmark1 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };
      
      const bookmark2 = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1`
      };
      
      expect(areBookmarksEqual(bookmark1, bookmark2)).toBe(false);
    });
  });
}); 
