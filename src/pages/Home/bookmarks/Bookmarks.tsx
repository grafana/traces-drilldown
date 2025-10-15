import { css } from "@emotion/css";
import { GrafanaTheme2 } from "@grafana/data";
import { Button, useStyles2, LoadingPlaceholder } from "@grafana/ui";
import React, { useEffect, useState } from "react";
import { BookmarkItem } from "./BookmarkItem";
import { useBookmarksStorage, goToBookmark } from "./utils";

export type Bookmark = {
  params: string;
}

export const Bookmarks = () => {
  const styles = useStyles2(getStyles);
  const { getBookmarks, removeBookmark } = useBookmarksStorage();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  useEffect(() => {
    const fetchBookmarks = async () => {
      setIsLoading(true);
      try {
        const loadedBookmarks = await getBookmarks();
        setBookmarks(loadedBookmarks);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
        setBookmarks([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookmarks();
  }, []);

  const removeBookmarkClicked = async (bookmark: Bookmark, event: React.MouseEvent) => {
    event.stopPropagation();
    setIsRemoving(true);
    
    try {
      await removeBookmark(bookmark);
      const updatedBookmarks = await getBookmarks();
      setBookmarks(updatedBookmarks);
    } catch (error) {
      console.error('Error removing bookmark:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className={styles.header}>
          <h4>Or view bookmarks</h4>
        </div>
        <div className={styles.loading}>
          <LoadingPlaceholder text="Loading bookmarks..." />
        </div>
      </div>
    );
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
            >
              <div className={styles.bookmarkItem}>
                <BookmarkItem bookmark={bookmark} />
              </div>
              <div className={styles.remove}>
                <Button
                  aria-label="Remove bookmark"
                  variant='secondary' 
                  fill='text' 
                  icon='trash-alt'
                  disabled={isRemoving}
                  onClick={(e) => removeBookmarkClicked(bookmark, e)}
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
    loading: css({
      display: 'flex',
      justifyContent: 'center',
      margin: `${theme.spacing(4)} 0`,
    }),
  }
}
