import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Bookmarks, Bookmark } from './Bookmarks';
import { getBookmarkForUrl, goToBookmark, useBookmarksStorage } from './utils';
import { locationService } from '@grafana/runtime';
import { VAR_DATASOURCE, VAR_FILTERS, VAR_GROUPBY, VAR_METRIC } from 'utils/shared';

// Mock the BookmarkItem component
jest.mock('./BookmarkItem', () => ({
  BookmarkItem: ({ bookmark }: { bookmark: any }) => {
    const primarySignal = new URLSearchParams(bookmark.params).get('primarySignal');
    // Display the primarySignal value for the test to find
    return <div>{primarySignal?.replace('_', ' ')}</div>;
  }
}));

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getBookmarkForUrl: jest.fn(),
  goToBookmark: jest.fn(),
  useBookmarksStorage: jest.fn().mockReturnValue({
    getBookmarks: jest.fn(),
    removeBookmark: jest.fn()
  })
}));

jest.mock('@grafana/runtime', () => ({
  reportInteraction: jest.fn(),
  locationService: {
    push: jest.fn(),
  },
  config: {},
}));

describe('Bookmarks', () => {
  const mockBookmarks: Bookmark[] = [
    {
      params: `actionView=breakdown&primarySignal=full_traces&var-${VAR_DATASOURCE}=EBorgLFZ&var-${VAR_FILTERS}=filter1|=|value1&var-${VAR_GROUPBY}=name&var-${VAR_METRIC}=rate`
    },
    {
      params: `actionView=comparison&primarySignal=server_spans&var-${VAR_DATASOURCE}=loki&var-${VAR_FILTERS}=filter2=value2&var-${VAR_GROUPBY}=service&var-${VAR_METRIC}=errors`
    }
  ];

  const mockUseBookmarksStorage = useBookmarksStorage as jest.Mock;
  const mockGetBookmarks = jest.fn();
  const mockRemoveBookmark = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetBookmarks.mockResolvedValue([]);
    mockRemoveBookmark.mockResolvedValue(undefined);
    
    mockUseBookmarksStorage.mockReturnValue({
      getBookmarks: mockGetBookmarks,
      removeBookmark: mockRemoveBookmark
    });
  });

  test('renders loading state initially', async () => {
    mockGetBookmarks.mockReturnValue(new Promise(resolve => setTimeout(() => resolve([]), 100)));
    
    render(<Bookmarks />);
    expect(screen.getByText('Loading bookmarks...')).toBeInTheDocument();
  });

  test('renders message when no bookmarks exist', async () => {
    mockGetBookmarks.mockResolvedValue([]);
    
    render(<Bookmarks />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading bookmarks...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Bookmark your favorite queries to view them here.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /trash/i })).not.toBeInTheDocument();
  });

  test('renders bookmarks when they exist', async () => {
    mockGetBookmarks.mockResolvedValue(mockBookmarks);
    
    render(<Bookmarks />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading bookmarks...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Or view bookmarks')).toBeInTheDocument();
    expect(screen.queryByText('Bookmark your favorite queries to view them here.')).not.toBeInTheDocument();
    
    // We expect there to be 2 trash buttons (one for each bookmark)
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  test('calls locationService.push when a bookmark is clicked', async () => {
    mockGetBookmarks.mockResolvedValue(mockBookmarks);
    const mockUrl = '/d/abc123/dashboard?var-datasource=prometheus';
    (getBookmarkForUrl as jest.Mock).mockReturnValue(mockUrl);
    (goToBookmark as jest.Mock).mockImplementation((bookmark) => {
      locationService.push(getBookmarkForUrl(bookmark));
    });
    
    render(<Bookmarks />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading bookmarks...')).not.toBeInTheDocument();
    });
    
    const bookmarkByText = screen.getByText('full traces').closest('div[class]');
    
    expect(bookmarkByText).not.toBeNull();
    fireEvent.click(bookmarkByText!);
    
    expect(goToBookmark).toHaveBeenCalledWith(mockBookmarks[0]);
    expect(getBookmarkForUrl).toHaveBeenCalledWith(mockBookmarks[0]);
    expect(locationService.push).toHaveBeenCalledWith(mockUrl);
  });

  test('calls removeBookmark when the trash button is clicked', async () => {
    mockGetBookmarks.mockResolvedValueOnce(mockBookmarks).mockResolvedValueOnce([mockBookmarks[1]]);
    mockRemoveBookmark.mockImplementation(() => {
      return Promise.resolve();
    });
    
    render(<Bookmarks />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading bookmarks...')).not.toBeInTheDocument();
    });
    
    const trashButtons = screen.getAllByRole('button');
    
    await act(async () => {
      fireEvent.click(trashButtons[0]);
    });
    
    expect(mockRemoveBookmark).toHaveBeenCalledWith(mockBookmarks[0]);    
    expect(mockGetBookmarks).toHaveBeenCalledTimes(2);
  });
}); 
