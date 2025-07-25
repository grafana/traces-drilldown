import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';

import { ShareExplorationAction } from './ShareExplorationAction';
import { TraceExploration } from '../../../pages/Explore';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getTemplateSrv: () => ({
    getAdhocFilters: jest.fn(),
  }),
}));

jest.mock('react-use', () => ({
  useLocation: jest.fn().mockReturnValue({ origin: 'http://localhost' }),
}));

jest.mock('../../../utils/utils', () => ({
  getUrlForExploration: jest.fn().mockReturnValue('/explore/trace'),
}));

describe('ShareExplorationAction', () => {
  const mockExploration = new TraceExploration({
    initialDS: 'mockDataSource',
    initialFilters: [],
  });

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
  });

  it('renders the component with the correct tooltip', async () => {
    render(<ShareExplorationAction exploration={mockExploration} />);
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Copy url');
    });
  });

  it('copies the exploration URL to the clipboard on button click', async () => {
    render(<ShareExplorationAction exploration={mockExploration} />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      fireEvent.click(button);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost/explore/trace');
  });

  it('updates the tooltip text when URL is copied', async () => {
    jest.useFakeTimers();
    
    render(<ShareExplorationAction exploration={mockExploration} />);
    
    const button = screen.getByRole('button');
    
    // Initial state
    expect(button).toHaveAttribute('aria-label', 'Copy url');
    
    // Click button to copy URL
    await act(async () => {
      fireEvent.click(button);
    });
    
    // Check if tooltip changes after click
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-label', 'Copied!');
    });
    
    // Fast-forward time to simulate timeout
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    
    // Check if tooltip resets after 2 seconds
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-label', 'Copy url');
    });
    
    jest.useRealTimers();
  });
});
