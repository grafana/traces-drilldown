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

export const getBookmarks = () => {
  return JSON.parse(localStorage.getItem(BOOKMARKS_LS_KEY) || "[]");
}

export const getBookmarkParams = (bookmark: Bookmark) => {
  const params = new URLSearchParams(bookmark.params);
  const actionView = params.get(ACTION_VIEW) ?? '';
  const primarySignal = params.get(PRIMARY_SIGNAL) ?? '';
  const filters = params.getAll(`var-${VAR_FILTERS}`).join(FILTER_SEPARATOR) ?? '';
  const metric = params.get(`var-${VAR_METRIC}`) ?? '';
  return { actionView, primarySignal, filters, metric };
}

export const getBookmarkFromURL = () => {
  const params = cleanupParams(new URLSearchParams(window.location.search));
  return { params: params.toString() };
}

export const getBookmarkForUrl = (bookmark: Bookmark) => {
  const params = new URLSearchParams(bookmark.params);
  const urlQueryMap = Object.fromEntries(params.entries());
  const filters = params.getAll(`var-${VAR_FILTERS}`); 
  const url = urlUtil.renderUrl(EXPLORATIONS_ROUTE, {
    ...urlQueryMap,
    [`var-${VAR_FILTERS}`]: filters // Filters need to be added as separate params in the url as there are multiple filters with the same key
  });
  return url;
}

export const toggleBookmark = () => {
  const bookmark = getBookmarkFromURL();
  bookmarkExists(bookmark) ? removeBookmark(bookmark) : addBookmark(bookmark);
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

export const bookmarkExists = (bookmark: Bookmark) => {
  const bookmarks = getBookmarks();
  return bookmarks.find((b: Bookmark) => {
    return areBookmarksEqual(b, bookmark);
  });
}

export const areBookmarksEqual = (bookmark: Bookmark, storedBookmark: Bookmark) => {
  const bookmarkParams = cleanupParams(new URLSearchParams(bookmark.params));
  const storedBookmarkParams = cleanupParams(new URLSearchParams(storedBookmark.params));

  // Check if both bookmarks have the same number of parameters
  let paramCount1 = 0;
  let paramCount2 = 0;
  for (const _ of bookmarkParams.keys()) paramCount1++;
  for (const _ of storedBookmarkParams.keys()) paramCount2++;
  
  if (paramCount1 !== paramCount2) {
    return false;
  }

  // Check if all key-value pairs match
  for (const [key, value] of storedBookmarkParams.entries()) {
    if (key === `var-${VAR_FILTERS}`) {
      const storedFilters = storedBookmarkParams.getAll(`var-${VAR_FILTERS}`);
      const bookmarkFilters = bookmarkParams.getAll(`var-${VAR_FILTERS}`);
      
      // Check if all filters match (regardless of order)
      if (storedFilters.length !== bookmarkFilters.length) {
        return false;
      }
      for (const filter of bookmarkFilters) {
        if (!storedFilters.includes(filter)) {
          return false;
        }
      }
    } else if (bookmarkParams.get(key) !== value) { // For regular parameters, compare values directly
      return false;
    }
  }

  return true;
}
