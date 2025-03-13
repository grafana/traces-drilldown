import { css } from "@emotion/css";
import { GrafanaTheme2 } from "@grafana/data";
import { locationService } from "@grafana/runtime";
import { Button, useStyles2 } from "@grafana/ui";
import React, { useState } from "react";
import { BOOKMARK_DATA_SOURCE, BOOKMARK_FILTERS, BOOKMARK_GROUPBY, BOOKMARK_METRIC } from "utils/shared";
import { BookmarkItem } from "./BookmarkItem";
import { getBookmarkForUrl, getBookmarks, removeBookmark } from "./utils";

export type Bookmark = {
  actionView: string;
  primarySignal: string;
  [BOOKMARK_DATA_SOURCE]: string;
  [BOOKMARK_FILTERS]: string;
  [BOOKMARK_GROUPBY]: string;
  [BOOKMARK_METRIC]: string;
}

export const Bookmarks = () => {
  const styles = useStyles2(getStyles);
  const [bookmarks, setBookmarks] = useState<Bookmark | any>(getBookmarks());

  const goToBookmark = (bookmark: Bookmark) => {
    const url = getBookmarkForUrl(bookmark);
    locationService.push(url);
  }

  return (
    <div>
      <div className={styles.header}>
        <h4>Or view bookmarks</h4>
      </div>
      {bookmarks.length === 0 ? (
        <p className={styles.noBookmarks}>Bookmark your favorite queries to view them here.</p>
      ) : (
        <div className={styles.bookmarks}>
          {bookmarks.map((bookmark: Bookmark, i: number) => (
            <div 
              className={styles.bookmark} 
              key={i} 
              onClick={() => goToBookmark(bookmark)}
              data-testid="bookmark-item"
            >
              <div className={styles.bookmarkItem}>
                <BookmarkItem bookmark={bookmark} />
              </div>
              <div className={styles.remove}>
                <Button 
                  variant='secondary' 
                  fill='text' 
                  icon='trash-alt'
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBookmark(bookmark);
                    setBookmarks(getBookmarks());
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    header: css({
      textAlign: 'center',
      'h4': {
        margin: 0,
      }
    }),
    bookmarks: css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(2),
      margin: `${theme.spacing(4)} 0 ${theme.spacing(2)} 0`,
      justifyContent: 'center',
    }),
    bookmark: css({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      cursor: 'pointer',
      width: '318px',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,

      '&:hover': {
        backgroundColor: theme.isDark ? theme.colors.background.secondary : theme.colors.background.primary,
      }
    }),
    bookmarkItem: css({
      padding: `${theme.spacing(1.5)} ${theme.spacing(1.5)} 0 ${theme.spacing(1.5)}`,
      overflow: 'hidden'
    }),
    filters: css({
      textOverflow: 'ellipsis', 
      overflow: 'hidden',
      WebkitLineClamp: 2, 
      display: '-webkit-box', 
      WebkitBoxOrient: 'vertical'
    }),
    remove: css({
      display: 'flex',
      justifyContent: 'flex-end',
    }),
    noBookmarks: css({
      margin: `${theme.spacing(4)} 0 ${theme.spacing(2)} 0`,
      textAlign: 'center',
    }),
  }
}
