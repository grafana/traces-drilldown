import { EVENT_ATTR, FILTER_SEPARATOR, RESOURCE_ATTR, SPAN_ATTR } from "utils/shared";
import React from "react";
import { capitalizeFirstChar } from "utils/utils";
import { css } from "@emotion/css";
import { useStyles2 } from "@grafana/ui";
import { Bookmark } from "./Bookmarks";
import { getBookmarkParams } from "./utils";
import { getSignalForKey } from "pages/Explore/primary-signals";

export const BookmarkItem = ({ bookmark }: { bookmark: Bookmark }) => {
  let { actionView, primarySignal, metric, filters } = getBookmarkParams(bookmark);
  const styles = useStyles2(getStyles);

  const getPrimarySignalFilter = (primarySignal: string) => {
    let filter = getSignalForKey(primarySignal)?.filter ?? '';
    return filter ? `${filter.key}|${filter.operator}|${filter.value}` : '';
  }
  
  // Don't render the primary signal filter as the primary signal already represents this information
  const getFiltersWithoutPrimarySignal = (filters: string, primarySignal: string) => {
    const primarySignalFilter = getPrimarySignalFilter(primarySignal);
    let filtersArray = filters.split(FILTER_SEPARATOR);
    filtersArray = filtersArray.filter(f => f !== primarySignalFilter);
    return filtersArray.join(FILTER_SEPARATOR);
  }

  filters = getFiltersWithoutPrimarySignal(filters, primarySignal);
  filters = filters.replace(/\|=\|/g, ' = ');
  filters = filters.replace(RESOURCE_ATTR, '').replace(SPAN_ATTR, '').replace(EVENT_ATTR, '');

  return (
    <div title={filters}>
      <div>
        <b>{capitalizeFirstChar(metric)}</b> of <b>{primarySignal.replace('_', ' ')}</b> ({actionView})
      </div>
      <div className={styles.filters}>
        {filters}
      </div>
    </div>
  );
}

function getStyles() {
  return {
    filters: css({
      textOverflow: 'ellipsis', 
      overflow: 'hidden',
      WebkitLineClamp: 2, 
      display: '-webkit-box', 
      WebkitBoxOrient: 'vertical'
    }),
  }
}
