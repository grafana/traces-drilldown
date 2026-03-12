import { ReactNode, useCallback, useEffect, useState } from 'react';

import semver from 'semver/preload';
import { v4 as uuidv4 } from 'uuid';

import { config } from '@grafana/runtime';
import { SceneObject } from '@grafana/scenes';
import { DataQuery } from '@grafana/schema';

import pluginJson from '../../../plugin.json';
import { TraceqlFilter, traceqlFiltersToAdHoc } from '../../../utils/links';
import { parseTraceQLQuery } from '../../../utils/lezer-traceql-parser';
import { getDatasourceVariable, getFiltersVariable, getTraceExplorationScene } from '../../../utils/utils';

const MIN_VERSION = '12.4.0-21256324731';
export const SAVED_SEARCHES_KEY = `${pluginJson.id}.savedSearches`;

const SAVED_SEARCHES_CHANGED_EVENT = `${pluginJson.id}.savedSearchesChanged`;

function notifySavedSearchesChanged() {
  window.dispatchEvent(new CustomEvent(SAVED_SEARCHES_CHANGED_EVENT));
}

export function isQueryLibrarySupported() {
  return !semver.ltr(config.buildInfo.version, MIN_VERSION) && config.featureToggles.queryLibrary;
}

export function useCheckForExistingSearch(dsUid: string, query: string) {
  const { searches } = useSavedSearches(dsUid);
  return searches.find((search) => search.query === query);
}

export function useHasSavedSearches(dsUid: string) {
  const { searches } = useSavedSearches(dsUid);
  return searches.length > 0;
}

/**
 * Parse a saved query into filters. If the query contains "&&", split by "&&" and parse each
 * segment so each becomes one filter in the filters bar (e.g. span:status=error&&resource.service.name="x" → two filters).
 */
function parseSavedQueryToFilters(query: string) {
  const segments = query.trim().split('&&').map((s) => s.trim()).filter(Boolean);
  const allFilters: TraceqlFilter[] = [];
  
  for (const segment of segments) {
    const result = parseTraceQLQuery(`{${segment}}`);
    if (result?.filters.length) {
      allFilters.push(...result.filters);
    }
  }
  return allFilters;
}

export function applySavedSearchToScene(sceneRef: SceneObject, query: string, dsUid: string): void {
  const filters = parseSavedQueryToFilters(query);
  const adHocFilters = filters.length > 0 ? traceqlFiltersToAdHoc(filters) : [];

  const traceExploration = getTraceExplorationScene(sceneRef);
  const filtersVariable = getFiltersVariable(traceExploration);
  filtersVariable.setState({ filters: adHocFilters });

  const dsVariable = getDatasourceVariable(sceneRef);
  if (dsUid && dsVariable.getValue()?.toString() !== dsUid) {
    dsVariable.changeValueTo(dsUid);
  }
}

export function useSavedSearches(dsUid: string) {
  const [searches, setSearches] = useState<SavedSearch[]>(() => getLocallySavedSearches(dsUid));

  useEffect(() => {
    const refresh = () => setSearches(getLocallySavedSearches(dsUid));
    window.addEventListener(SAVED_SEARCHES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_SEARCHES_CHANGED_EVENT, refresh);
  }, [dsUid]);

  const deleteSearch = useCallback(
    async (uid: string) => {
      removeFromLocalStorage(uid);
      setSearches(getLocallySavedSearches(dsUid));
      notifySavedSearchesChanged();
    },
    [dsUid]
  );

  const saveSearch = useCallback(
    async (search: Omit<SavedSearch, 'timestamp' | 'uid'>) => {
      saveInLocalStorage(search);
      setSearches(getLocallySavedSearches(dsUid));
      notifySavedSearchesChanged();
    },
    [dsUid]
  );

  return {
    isLoading: false,
    saveSearch,
    searches,
    deleteSearch,
  };
}

const isString = (s: unknown) => (typeof s === 'string' && s) || '';

function narrowSavedSearch(search: unknown): SavedSearch | null {
  if (typeof search !== 'object' || search === null) {
    return null;
  }
  return 'title' in search &&
    'description' in search &&
    'query' in search &&
    'timestamp' in search &&
    'dsUid' in search &&
    'uid' in search
    ? {
        description: isString(search.description),
        dsUid: isString(search.dsUid),
        query: isString(search.query),
        timestamp: Number(search.timestamp),
        title: isString(search.title),
        uid: isString(search.uid),
      }
    : null;
}

export function narrowSavedSearches(searches: unknown): SavedSearch[] {
  if (!Array.isArray(searches)) {
    return [];
  }
  return searches.map((search) => narrowSavedSearch(search)).filter((search) => search !== null);
}

function getLocallySavedSearches(dsUid?: string) {
  let stored: SavedSearch[] = [];
  try {
    stored = narrowSavedSearches(JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) ?? '[]'));
  } catch (e) {
    console.error(e);
  }
  stored.sort((a, b) => b.timestamp - a.timestamp);
  return stored.filter((search) => (dsUid ? search.dsUid === dsUid : true));
}

export interface SavedSearch {
  description: string;
  dsUid: string;
  query: string;
  timestamp: number;
  title: string;
  uid: string;
}

function saveInLocalStorage({ query, title, description, dsUid }: Omit<SavedSearch, 'timestamp' | 'uid'>) {
  const stored = getLocallySavedSearches();

  stored.push({
    dsUid,
    description,
    query,
    timestamp: new Date().getTime(),
    title,
    uid: uuidv4(),
  });

  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(stored));
}

function removeFromLocalStorage(uid: string) {
  const stored = getLocallySavedSearches();
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(stored.filter((search) => search.uid !== uid)));
}

export interface OpenQueryLibraryComponentProps {
  className?: string;
  context?: string;
  datasourceFilters?: string[];
  fallbackComponent?: ReactNode;
  icon?: string;
  onSelectQuery?(query: DataQuery): void;
  query?: DataQuery;
  tooltip?: string;
}
