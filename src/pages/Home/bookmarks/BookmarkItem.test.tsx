import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookmarkItem } from './BookmarkItem';
import { Bookmark } from './Bookmarks';
import { ACTION_VIEW, BOOKMARK_DATA_SOURCE, BOOKMARK_FILTERS, BOOKMARK_GROUPBY, BOOKMARK_METRIC, PRIMARY_SIGNAL } from "utils/shared";

describe('BookmarkItem', () => {
  const mockBookmark: Bookmark = {
    [ACTION_VIEW]: 'breakdown',
    [PRIMARY_SIGNAL]: 'full_traces',
    [BOOKMARK_DATA_SOURCE]: 'EBorgLFZ',
    [BOOKMARK_FILTERS]: 'filter1|=|value1',
    [BOOKMARK_GROUPBY]: 'name',
    [BOOKMARK_METRIC]: 'rate',
  };

  test('renders bookmark information correctly', () => {
    render(<BookmarkItem bookmark={mockBookmark} />);

    expect(screen.getByText(/Rate/i)).toBeInTheDocument();
    expect(screen.getByText('full traces')).toBeInTheDocument();
    expect(screen.getByText(/breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/filter1 = value1/i)).toBeInTheDocument();
  });
}); 
