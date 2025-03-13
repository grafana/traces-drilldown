import { 
  getBookmarks, 
  bookmarkExists, 
  getBookmarkParams, 
  getBookmarkFromURL, 
  toggleBookmark,
  removeBookmark,
  getBookmarkForUrl
} from './utils';
import { ACTION_VIEW, PRIMARY_SIGNAL, BOOKMARK_DATA_SOURCE, BOOKMARK_FILTERS, BOOKMARK_GROUPBY, BOOKMARK_METRIC, BOOKMARKS_LS_KEY, EXPLORATIONS_ROUTE, FILTER_SEPARATOR } from 'utils/shared';

describe('Bookmark Utils', () => {
  const sampleBookmark = {
    [ACTION_VIEW]: 'breakdown',
    [PRIMARY_SIGNAL]: 'full_traces',
    [BOOKMARK_DATA_SOURCE]: 'EBorgLFZ',
    [BOOKMARK_FILTERS]: 'filter1|=|value1',
    [BOOKMARK_GROUPBY]: 'name',
    [BOOKMARK_METRIC]: 'rate'
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
        datasource: 'EBorgLFZ',
        filters: 'filter1|=|value1',
        groupBy: 'name',
        metric: 'rate'
      });
    });

    it('should handle empty bookmark values', () => {
      const emptyBookmark = {
        [ACTION_VIEW]: '',
        [PRIMARY_SIGNAL]: '',
        [BOOKMARK_DATA_SOURCE]: '',
        [BOOKMARK_FILTERS]: '',
        [BOOKMARK_GROUPBY]: '',
        [BOOKMARK_METRIC]: ''
      };
      
      const params = getBookmarkParams(emptyBookmark);
      expect(params).toEqual({
        actionView: '',
        primarySignal: '',
        datasource: '',
        filters: '',
        groupBy: '',
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
      window.location.search = `?${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&${BOOKMARK_DATA_SOURCE}=EBorgLFZ&${BOOKMARK_FILTERS}=filter1|=|value1&${BOOKMARK_GROUPBY}=name&${BOOKMARK_METRIC}=rate`;
      
      const bookmark = getBookmarkFromURL();
      expect(bookmark).toEqual({
        [ACTION_VIEW]: 'breakdown',
        [PRIMARY_SIGNAL]: 'full_traces',
        [BOOKMARK_DATA_SOURCE]: 'EBorgLFZ',
        [BOOKMARK_FILTERS]: 'filter1|=|value1',
        [BOOKMARK_GROUPBY]: 'name',
        [BOOKMARK_METRIC]: 'rate'
      });
    });

    it('should handle empty URL parameters', () => {
      window.location.search = '';
      
      const bookmark = getBookmarkFromURL();
      expect(bookmark).toEqual({
        [ACTION_VIEW]: '',
        [PRIMARY_SIGNAL]: '',
        [BOOKMARK_DATA_SOURCE]: '',
        [BOOKMARK_FILTERS]: '',
        [BOOKMARK_GROUPBY]: '',
        [BOOKMARK_METRIC]: ''
      });
    });
  });

  describe('getBookmarkForUrl', () => {
    it('should generate a URL with all parameters', () => {
      const bookmark = {
        actionView: 'breakdown',
        primarySignal: 'full_traces',
        [BOOKMARK_DATA_SOURCE]: 'EBorgLFZ',
        [BOOKMARK_FILTERS]: 'filter1|=|value1',
        [BOOKMARK_GROUPBY]: 'name',
        [BOOKMARK_METRIC]: 'rate'
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-ds=EBorgLFZ&var-metric=rate&var-groupBy=name&${BOOKMARK_FILTERS}=filter1%7C%3D%7Cvalue1`);
    });

    it('should handle multiple filters correctly', () => {
      const bookmark = {
        actionView: 'breakdown',
        primarySignal: 'full_traces',
        [BOOKMARK_DATA_SOURCE]: 'EBorgLFZ',
        [BOOKMARK_FILTERS]: `filter1|=|value1${FILTER_SEPARATOR}filter2|=|value2`,
        [BOOKMARK_GROUPBY]: 'name',
        [BOOKMARK_METRIC]: 'rate'
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-ds=EBorgLFZ&var-metric=rate&var-groupBy=name&${BOOKMARK_FILTERS}=filter1%7C%3D%7Cvalue1&${BOOKMARK_FILTERS}=filter2%7C%3D%7Cvalue2`);
    });

    it('should handle a bookmark with no filters', () => {
      const bookmark = {
        actionView: 'breakdown',
        primarySignal: 'full_traces',
        [BOOKMARK_DATA_SOURCE]: 'EBorgLFZ',
        [BOOKMARK_FILTERS]: '',
        [BOOKMARK_GROUPBY]: 'name',
        [BOOKMARK_METRIC]: 'rate'
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-ds=EBorgLFZ&var-metric=rate&var-groupBy=name&var-filters=`);
    });

    it('should handle empty parameters', () => {
      const bookmark = {
        actionView: '',
        primarySignal: '',
        [BOOKMARK_DATA_SOURCE]: 'EBorgLFZ',
        [BOOKMARK_FILTERS]: '',
        [BOOKMARK_GROUPBY]: '',
        [BOOKMARK_METRIC]: ''
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=&primarySignal=&var-ds=EBorgLFZ&var-metric=&var-groupBy=&var-filters=`);
    });
  });

  describe('addBookmark', () => {
    const originalLocation = window.location;
    
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...originalLocation,
          search: `?${ACTION_VIEW}=search&${PRIMARY_SIGNAL}=full_traces`
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
      expect(storedData[0][ACTION_VIEW]).toBe('search');
      expect(storedData[0][PRIMARY_SIGNAL]).toBe('full_traces');
    });
    
    it('should add a bookmark to an existing list in localStorage', () => {
      // Add an initial bookmark
      localStorageMock[BOOKMARKS_LS_KEY] = JSON.stringify([{
        [ACTION_VIEW]: 'breakdown',
        [PRIMARY_SIGNAL]: 'full_traces',
        [BOOKMARK_DATA_SOURCE]: 'source1',
        [BOOKMARK_FILTERS]: 'filter1|=|value1',
        [BOOKMARK_GROUPBY]: 'name',
        [BOOKMARK_METRIC]: 'rate'
      }]);
      
      // Add a new bookmark with different parameters
      window.location.search = `?${ACTION_VIEW}=search&${PRIMARY_SIGNAL}=full_traces`;
      toggleBookmark();
      
      const storedData = JSON.parse(localStorageMock[BOOKMARKS_LS_KEY] || '[]');
      expect(storedData.length).toBe(2);
      expect(storedData[0][ACTION_VIEW]).toBe('breakdown');
      expect(storedData[1][ACTION_VIEW]).toBe('search');
      expect(storedData[1][PRIMARY_SIGNAL]).toBe('full_traces');
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
      expect(storedData[0][ACTION_VIEW]).toBe('breakdown');
      expect(storedData[0][PRIMARY_SIGNAL]).toBe('full_traces');
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
        ...sampleBookmark,
        [ACTION_VIEW]: 'differentView'
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
}); 
