import { ACTION_VIEW, PRIMARY_SIGNAL, BOOKMARK_DATA_SOURCE, BOOKMARK_FILTERS, BOOKMARK_GROUPBY, BOOKMARK_METRIC, BOOKMARK_KEYS, FILTER_SEPARATOR, BOOKMARKS_LS_KEY, EXPLORATIONS_ROUTE } from "utils/shared";
import { Bookmark } from "./Bookmarks";
import { urlUtil } from "@grafana/data";

export const getBookmarks = () => {
  return JSON.parse(localStorage.getItem(BOOKMARKS_LS_KEY) || "[]");
}

export const getBookmarkParams = (bookmark: Bookmark) => {
  const actionView = bookmark[ACTION_VIEW] ?? '';
  const primarySignal = bookmark[PRIMARY_SIGNAL] ?? '';
  const datasource = bookmark[BOOKMARK_DATA_SOURCE] ?? '';
  const filters = bookmark[BOOKMARK_FILTERS] ?? '';
  const groupBy = bookmark[BOOKMARK_GROUPBY] ?? '';
  const metric = bookmark[BOOKMARK_METRIC] ?? '';
  return { actionView, primarySignal, datasource, filters, groupBy, metric };
}

export const getBookmarkFromURL = () => {
  const bookmark: Bookmark = {
    [ACTION_VIEW]: '',
    [PRIMARY_SIGNAL]: '',
    [BOOKMARK_DATA_SOURCE]: '',
    [BOOKMARK_FILTERS]: '',
    [BOOKMARK_GROUPBY]: '',
    [BOOKMARK_METRIC]: ''
  };

  const params = new URLSearchParams(window.location.search);
  const filters: string[] = [];

  params.forEach((value, key) => {
    if (BOOKMARK_KEYS.includes(key) && value && value !== '') {
      if (key === BOOKMARK_FILTERS) {
        filters.push(value);
      } else {
        bookmark[key as keyof Bookmark] = value;
      }
    }
  });

  bookmark[BOOKMARK_FILTERS] = filters.join(FILTER_SEPARATOR);
  return bookmark;
}

export const getBookmarkForUrl = (bookmark: Bookmark) => {
  let { actionView, primarySignal, datasource, metric, filters, groupBy } = getBookmarkParams(bookmark);

  const params = {
    [ACTION_VIEW]: actionView,
    [PRIMARY_SIGNAL]: primarySignal,
    [BOOKMARK_DATA_SOURCE]: datasource,
    [BOOKMARK_METRIC]: metric,
    [BOOKMARK_GROUPBY]: groupBy,
  }

  let url = urlUtil.renderUrl(EXPLORATIONS_ROUTE, params);
  
  // filters need to be added as separate params in the url
  // otherwise they would be overridden by each other
  filters.split(FILTER_SEPARATOR).forEach(f => {
    const params = {
      [BOOKMARK_FILTERS]: f,
    }
    const filterForUrl = urlUtil.renderUrl('', params).replace('?', '&');
    url += `${filterForUrl}`;
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
  const bookmarks = getBookmarks();
  const filteredBookmarks = bookmarks.filter((b: Bookmark) => !areBookmarksEqual(b, bookmark));  
  localStorage.setItem(BOOKMARKS_LS_KEY, JSON.stringify(filteredBookmarks));
}

export const bookmarkExists = (bookmark: Bookmark) => {
  const bookmarks = getBookmarks();
  return bookmarks.find((b: Bookmark) => {
    return areBookmarksEqual(b, bookmark);
  });
}

const areBookmarksEqual = (b: Bookmark, bookmark: Bookmark) => {
  return BOOKMARK_KEYS.every(key => {
    return b[key as keyof Bookmark] === bookmark[key as keyof Bookmark];
  });
}
