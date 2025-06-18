import React from 'react';
import { render, screen } from '@testing-library/react';
import { BookmarkItem } from './BookmarkItem';
import { Bookmark } from './Bookmarks';
import { VAR_DATASOURCE, VAR_FILTERS, VAR_GROUPBY, VAR_METRIC } from 'utils/shared';
  
describe('BookmarkItem', () => {
  const mockBookmark: Bookmark = {
    params: `actionView=breakdown&primarySignal=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
  };

  test('renders bookmark information correctly', () => {
    render(<BookmarkItem bookmark={mockBookmark} />);

    expect(screen.getByText(/Rate/i)).toBeInTheDocument();
    expect(screen.getByText('full traces')).toBeInTheDocument();
    expect(screen.getByText(/breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/filter1 = value1/i)).toBeInTheDocument();
  });
}); 
