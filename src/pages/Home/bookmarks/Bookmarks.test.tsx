import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Bookmarks, Bookmark } from './Bookmarks';
import { getBookmarks, getBookmarkForUrl } from './utils';
import { locationService } from '@grafana/runtime';
import { ACTION_VIEW, BOOKMARK_DATA_SOURCE, BOOKMARK_FILTERS, BOOKMARK_GROUPBY, BOOKMARK_METRIC, PRIMARY_SIGNAL } from "utils/shared";

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getBookmarks: jest.fn(),
  getBookmarkForUrl: jest.fn(),
}));

jest.mock('@grafana/runtime', () => ({
  locationService: {
    push: jest.fn(),
  },
  config: {},
}));

describe('Bookmarks', () => {
  const mockBookmarks: Bookmark[] = [
    {
      [ACTION_VIEW]: 'breakdown',
      [PRIMARY_SIGNAL]: 'full_traces',
      [BOOKMARK_DATA_SOURCE]: 'EBorgLFZ',
      [BOOKMARK_FILTERS]: 'filter1|=|value1',
      [BOOKMARK_GROUPBY]: 'name',
      [BOOKMARK_METRIC]: 'rate',
    },
    {
      [ACTION_VIEW]: 'comparison',
      [PRIMARY_SIGNAL]: 'server_spans',
      [BOOKMARK_DATA_SOURCE]: 'loki',
      [BOOKMARK_FILTERS]: 'filter2=value2',
      [BOOKMARK_GROUPBY]: 'service',
      [BOOKMARK_METRIC]: 'errors',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders message when no bookmarks exist', () => {
    (getBookmarks as jest.Mock).mockReturnValue([]);
    
    render(<Bookmarks />);
    
    expect(screen.getByText('Bookmark your favorite queries to view them here.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('renders bookmarks when they exist', () => {
    (getBookmarks as jest.Mock).mockReturnValue(mockBookmarks);
    
    render(<Bookmarks />);
    
    expect(screen.getByText('Or view bookmarks')).toBeInTheDocument();
    expect(screen.queryByText('Bookmark your favorite queries to view them here.')).not.toBeInTheDocument();
    
    // We expect there to be 2 trash buttons (one for each bookmark)
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  test('calls locationService.push when a bookmark is clicked', () => {
    (getBookmarks as jest.Mock).mockReturnValue(mockBookmarks);
    const mockUrl = '/d/abc123/dashboard?var-datasource=prometheus';
    (getBookmarkForUrl as jest.Mock).mockReturnValue(mockUrl);
    
    render(<Bookmarks />);
    
    const bookmarkByText = screen.getByText('full traces').closest('div[class]');
    
    expect(bookmarkByText).not.toBeNull();
    fireEvent.click(bookmarkByText!);
    
    expect(getBookmarkForUrl).toHaveBeenCalledWith(mockBookmarks[0]);
    expect(locationService.push).toHaveBeenCalledWith(mockUrl);
  });
}); 
