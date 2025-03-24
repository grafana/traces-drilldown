import { ACTION_VIEW, PRIMARY_SIGNAL, VAR_FILTERS, FILTER_SEPARATOR, BOOKMARKS_LS_KEY, EXPLORATIONS_ROUTE, VAR_LATENCY_PARTIAL_THRESHOLD, VAR_LATENCY_THRESHOLD, SELECTION, VAR_METRIC } from "utils/shared";
import { Bookmark } from "./Bookmarks";
import { urlUtil } from "@grafana/data";

const cleanupParams = (params: URLSearchParams) => {
  // Remove selection, latency threshold, and latency partial threshold because
  // selection keeps changing as time moves on, so it's not a good match for bookmarking
  params.delete(SELECTION);
  params.delete(`var-${VAR_LATENCY_THRESHOLD}`);
  params.delete(`var-${VAR_LATENCY_PARTIAL_THRESHOLD}`);
  return params;
}

export const getBookmarks = (): Bookmark[] => {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_LS_KEY) || "[]");
  } catch (e) {
    console.error("Failed to get bookmarks from localStorage:", e);
    return [];
  }
}

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

export const toggleBookmark = (): boolean => {
  const bookmark = getBookmarkFromURL();
  const exists = bookmarkExists(bookmark);
  
  if (exists) {
    removeBookmark(bookmark);
    return false; 
  } else {
    addBookmark(bookmark);
    return true; 
  }
}

const addBookmark = (bookmark: Bookmark) => {
  const bookmarks = getBookmarks();
  bookmarks.push(bookmark);
  localStorage.setItem(BOOKMARKS_LS_KEY, JSON.stringify(bookmarks));
}

export const removeBookmark = (bookmark: Bookmark) => {
  const storedBookmarks = getBookmarks();
  const filteredBookmarks = storedBookmarks.filter((storedBookmark: Bookmark) => !areBookmarksEqual(bookmark, storedBookmark));  
  localStorage.setItem(BOOKMARKS_LS_KEY, JSON.stringify(filteredBookmarks));
}

export const bookmarkExists = (bookmark: Bookmark): boolean => {
  const bookmarks = getBookmarks();
  return bookmarks.some((b: Bookmark) => areBookmarksEqual(b, bookmark));
}

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
