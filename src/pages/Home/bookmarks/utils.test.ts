import { 
  getBookmarkParams, 
  getBookmarkFromURL, 
  getBookmarkForUrl,
  areBookmarksEqual,
  useBookmarksStorage
} from './utils';
import { ACTION_VIEW, PRIMARY_SIGNAL, BOOKMARKS_LS_KEY, EXPLORATIONS_ROUTE, VAR_DATASOURCE, VAR_FILTERS, VAR_GROUPBY, VAR_METRIC, SELECTION, VAR_LATENCY_THRESHOLD, VAR_LATENCY_PARTIAL_THRESHOLD } from 'utils/shared';
import { renderHook } from '@testing-library/react';
import { usePluginUserStorage } from '@grafana/runtime';

jest.mock('@grafana/runtime', () => ({
  usePluginUserStorage: jest.fn().mockReturnValue({
    getItem: jest.fn(),
    setItem: jest.fn()
  }),
}));

describe('Bookmark Utils', () => {
  const sampleBookmark = {
    params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
  };

  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn()
  };
  
  const mockedUsePluginUserStorage = usePluginUserStorage as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePluginUserStorage.mockReturnValue(mockStorage);
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  describe('useBookmarksStorage', () => {
    it('should return the bookmarks API hooks', () => {
      const { result } = renderHook(() => useBookmarksStorage());
      
      expect(result.current).toHaveProperty('getBookmarks');
      expect(result.current).toHaveProperty('removeBookmark');
      expect(result.current).toHaveProperty('bookmarkExists');
      expect(result.current).toHaveProperty('toggleBookmark');
    });

    describe('getBookmarks', () => {
      it('should return empty array when storage is empty', async () => {
        mockStorage.getItem.mockResolvedValue(null);
        
        const { result } = renderHook(() => useBookmarksStorage());
        const bookmarks = await result.current.getBookmarks();
        
        expect(bookmarks).toEqual([]);
        expect(mockStorage.getItem).toHaveBeenCalledWith(BOOKMARKS_LS_KEY);
      });
  
      it('should return bookmarks from storage', async () => {
        const bookmarksData = [sampleBookmark];
        mockStorage.getItem.mockResolvedValue(JSON.stringify(bookmarksData));
        
        const { result } = renderHook(() => useBookmarksStorage());
        const bookmarks = await result.current.getBookmarks();
        
        expect(bookmarks).toEqual(bookmarksData);
      });
  
      it('should handle JSON parse errors', async () => {
        mockStorage.getItem.mockResolvedValue('invalid json');
        
        // Temporarily mock console.error to suppress output
        const originalConsoleError = console.error;
        console.error = jest.fn();
        
        try {
          const { result } = renderHook(() => useBookmarksStorage());
          const bookmarks = await result.current.getBookmarks();
          
          expect(bookmarks).toEqual([]);
          expect(console.error).toHaveBeenCalled();
        } finally {
          // Restore console.error
          console.error = originalConsoleError;
        }
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
  
        mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
      });
  
      afterEach(() => {
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: originalLocation
        });
      });
  
      it('should add bookmark when it does not exist', async () => {
        mockStorage.getItem.mockResolvedValue(JSON.stringify([]));
        
        const { result } = renderHook(() => useBookmarksStorage());
        const isNowBookmarked = await result.current.toggleBookmark();
        
        expect(isNowBookmarked).toBe(true);
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          BOOKMARKS_LS_KEY,
          expect.stringContaining('actionView=breakdown')
        );
      });
  
      it('should remove bookmark when it exists', async () => {
        const currentBookmark = getBookmarkFromURL();
        mockStorage.getItem.mockResolvedValue(JSON.stringify([currentBookmark]));
        
        const { result } = renderHook(() => useBookmarksStorage());
        const isNowBookmarked = await result.current.toggleBookmark();
        
        expect(isNowBookmarked).toBe(false);
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          BOOKMARKS_LS_KEY,
          '[]'
        );
      });
    });
  
    describe('removeBookmark', () => {
      it('should remove a bookmark', async () => {
        mockStorage.getItem.mockResolvedValue(JSON.stringify([sampleBookmark]));
        
        const { result } = renderHook(() => useBookmarksStorage());
        await result.current.removeBookmark(sampleBookmark);
        
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          BOOKMARKS_LS_KEY,
          '[]'
        );
      });
  
      it('should do nothing if bookmark does not exist', async () => {
        const differentBookmark = {
          params: 'actionView=different'
        };
        mockStorage.getItem.mockResolvedValue(JSON.stringify([differentBookmark]));
        
        const { result } = renderHook(() => useBookmarksStorage());
        await result.current.removeBookmark(sampleBookmark);
        
        expect(mockStorage.setItem).toHaveBeenCalledWith(
          BOOKMARKS_LS_KEY,
          JSON.stringify([differentBookmark])
        );
      });
    });
  
    describe('bookmarkExists', () => {
      it('should return true if bookmark exists', async () => {
        mockStorage.getItem.mockResolvedValue(JSON.stringify([sampleBookmark]));
        
        const { result } = renderHook(() => useBookmarksStorage());
        const exists = await result.current.bookmarkExists(sampleBookmark);
        
        expect(exists).toBe(true);
      });
  
      it('should return false if bookmark does not exist', async () => {
        const differentBookmark = {
          params: 'actionView=different'
        };
        mockStorage.getItem.mockResolvedValue(JSON.stringify([differentBookmark]));
        
        const { result } = renderHook(() => useBookmarksStorage());
        const exists = await result.current.bookmarkExists(sampleBookmark);
        
        expect(exists).toBe(false);
      });
  
      it('should return false if storage is empty', async () => {
        mockStorage.getItem.mockResolvedValue(null);
        
        const { result } = renderHook(() => useBookmarksStorage());
        const exists = await result.current.bookmarkExists(sampleBookmark);
        
        expect(exists).toBe(false);
      });
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
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1%7C%3D%7Cvalue1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`);
    });

    it('should handle multiple filters correctly', () => {
      const bookmark = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_FILTERS}=filter2|=|value2&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1%7C%3D%7Cvalue1&var-${VAR_FILTERS}=filter2%7C%3D%7Cvalue2&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`);
    });

    it('should handle a bookmark with no filters', () => {
      const bookmark = {
        params: `${ACTION_VIEW}=breakdown&${PRIMARY_SIGNAL}=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=breakdown&primarySignal=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`);
    });

    it('should handle empty parameters', () => {
      const bookmark = {
        params: `${ACTION_VIEW}=&${PRIMARY_SIGNAL}=&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_GROUPBY}=&var-${VAR_METRIC}=`
      };

      const url = getBookmarkForUrl(bookmark);
      expect(url).toBe(`${EXPLORATIONS_ROUTE}?actionView=&primarySignal=&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_GROUPBY}=&var-${VAR_METRIC}=`);
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
