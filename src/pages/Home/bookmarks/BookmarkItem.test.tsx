import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookmarkItem } from './BookmarkItem';
import { Bookmark } from './Bookmarks';

describe('BookmarkItem', () => {
  const mockBookmark: Bookmark = {
    params: 'actionView=breakdown&primarySignal=full_traces&var-ds=EBorgLFZ&var-filters=filter1|=|value1&var-groupBy=name&var-metric=rate'
  };

  test('renders bookmark information correctly', () => {
    render(<BookmarkItem bookmark={mockBookmark} />);

    expect(screen.getByText(/Rate/i)).toBeInTheDocument();
    expect(screen.getByText('full traces')).toBeInTheDocument();
    expect(screen.getByText(/breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/filter1 = value1/i)).toBeInTheDocument();
  });
}); 
