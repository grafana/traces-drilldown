import { ACTION_VIEW, PRIMARY_SIGNAL, VAR_FILTERS, FILTER_SEPARATOR, BOOKMARKS_LS_KEY, EXPLORATIONS_ROUTE, VAR_LATENCY_PARTIAL_THRESHOLD, VAR_LATENCY_THRESHOLD, SELECTION, VAR_METRIC } from "utils/shared";
import { Bookmark } from "./Bookmarks";
import { urlUtil } from "@grafana/data";
import { usePluginUserStorage } from '@grafana/runtime';

type PluginStorage = ReturnType<typeof usePluginUserStorage>;

const cleanupParams = (params: URLSearchParams) => {
  // Remove selection, latency threshold, and latency partial threshold because
  // selection keeps changing as time moves on, so it's not a good match for bookmarking
  params.delete(SELECTION);
  params.delete(`var-${VAR_LATENCY_THRESHOLD}`);
  params.delete(`var-${VAR_LATENCY_PARTIAL_THRESHOLD}`);
  return params;
}

export const useBookmarksStorage = () => {
  const storage = usePluginUserStorage();
  
  return {
    getBookmarks: () => getBookmarks(storage),
    removeBookmark: (bookmark: Bookmark) => removeBookmark(storage, bookmark),
    bookmarkExists: (bookmark: Bookmark) => bookmarkExists(storage, bookmark),
    toggleBookmark: () => toggleBookmark(storage),
  };
};

export const getBookmarkParams = (bookmark: Bookmark) => {
  if (!bookmark || !bookmark.params) {
    return { actionView: '', primarySignal: '', filters: '', metric: '' };
  }
  
  const params = new URLSearchParams(bookmark.params);
  const actionView = params.get(ACTION_VIEW) ?? '';
  const primarySignal = params.get(PRIMARY_SIGNAL) ?? '';
  const filters = params.getAll(`var-${VAR_FILTERS}`).join(FILTER_SEPARATOR);
  const metric = params.get(`var-${VAR_METRIC}`) ?? '';
  return { actionView, primarySignal, filters, metric };
}

export const getBookmarkFromURL = (): Bookmark => {
  const params = cleanupParams(new URLSearchParams(window.location.search));
  return { params: params.toString() };
}

export const getBookmarkForUrl = (bookmark: Bookmark): string => {
  if (!bookmark || !bookmark.params) {
    return EXPLORATIONS_ROUTE;
  }
  
  const params = new URLSearchParams(bookmark.params);
  const urlQueryMap = Object.fromEntries(params.entries());
  
  const filters = params.getAll(`var-${VAR_FILTERS}`); 
  
  const url = urlUtil.renderUrl(EXPLORATIONS_ROUTE, {
    ...urlQueryMap,
    [`var-${VAR_FILTERS}`]: filters // Filters need to be added as separate params in the url as there are multiple filters with the same key
  });
  
  return url;
}

const setBookmarks = async (storage: PluginStorage, bookmarks: Bookmark[]): Promise<void> => {
  try {
    await storage.setItem(BOOKMARKS_LS_KEY, JSON.stringify(bookmarks));
  } catch (e) {
    console.error("Failed to save bookmarks to storage:", e);
  }
};

export const getBookmarks = async (storage: PluginStorage): Promise<Bookmark[]> => {
  try {
    const value = await storage.getItem(BOOKMARKS_LS_KEY);
    if (value) {
      return JSON.parse(value);
    }
    return [];
  } catch (e) {
    console.error("Failed to get bookmarks from storage:", e);
    return [];
  }
};

export const toggleBookmark = async (storage: PluginStorage): Promise<boolean> => {
  const bookmark = getBookmarkFromURL();
  const exists = await bookmarkExists(storage, bookmark);
  
  if (exists) {
    await removeBookmark(storage, bookmark);
    return false;
  } else {
    await addBookmark(storage, bookmark);
    return true;
  }
};

const addBookmark = async (storage: PluginStorage, bookmark: Bookmark): Promise<void> => {
  const bookmarks = await getBookmarks(storage);
  bookmarks.push(bookmark);
  await setBookmarks(storage, bookmarks);
};

export const removeBookmark = async (storage: PluginStorage, bookmark: Bookmark): Promise<void> => {
  const storedBookmarks = await getBookmarks(storage);
  const filteredBookmarks = storedBookmarks.filter((storedBookmark) => !areBookmarksEqual(bookmark, storedBookmark));
  await setBookmarks(storage, filteredBookmarks);
};

export const bookmarkExists = async (storage: PluginStorage, bookmark: Bookmark): Promise<boolean> => {
  const bookmarks = await getBookmarks(storage);
  return bookmarks.some((b) => areBookmarksEqual(bookmark, b));
};

export const areBookmarksEqual = (bookmark: Bookmark, storedBookmark: Bookmark) => {
  const bookmarkParams = cleanupParams(new URLSearchParams(bookmark.params));
  const storedBookmarkParams = cleanupParams(new URLSearchParams(storedBookmark.params));

  const filterKey = `var-${VAR_FILTERS}`;
  const bookmarkKeys = Array.from(bookmarkParams.keys()).filter(k => k !== filterKey);
  const storedKeys = Array.from(storedBookmarkParams.keys()).filter(k => k !== filterKey);

  // If they have different number of keys (excluding filters), they can't be equal
  if (bookmarkKeys.length !== storedKeys.length) {
    return false;
  }
  
  // Check if every key in bookmarkParams exists in storedBookmarkParams with the same value
  const allKeysMatch = bookmarkKeys.every(key => 
    storedBookmarkParams.has(key) && bookmarkParams.get(key) === storedBookmarkParams.get(key)
  );  
  if (!allKeysMatch) {
    return false;
  }
  
  // Compare filters (which can have multiple values with the same key)
  const bookmarkFilters = bookmarkParams.getAll(filterKey);
  const storedFilters = storedBookmarkParams.getAll(filterKey);  
  if (bookmarkFilters.length !== storedFilters.length) {
    return false;
  }
  
  // Check if every filter in bookmarkFilters exists in storedFilters
  // This handles cases where order might be different
  return bookmarkFilters.every(filter => storedFilters.includes(filter));
}
