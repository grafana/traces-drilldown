import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SpanListColumnsSelector } from './SpanListColumnsSelector';
import { SelectableValue } from '@grafana/data';

describe('SpanListColumnsSelector', () => {
  const mockOptions: Array<SelectableValue<string>> = [
    { label: 'Duration', value: 'duration' },
    { label: 'Start Time', value: 'startTime' },
    { label: 'Tags', value: 'tags' },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display "Add extra columns" label', async () => {
    render(<SpanListColumnsSelector options={mockOptions} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByText('Add extra columns')).toBeInTheDocument();
    });
  });

  it('should show placeholder text when no value is selected', async () => {
    render(<SpanListColumnsSelector options={mockOptions} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByText('Select an attribute')).toBeInTheDocument();
    });
  });

  it('should display pre-selected values', async () => {
    render(<SpanListColumnsSelector options={mockOptions} onChange={mockOnChange} value="Duration,Tags" />);

    await waitFor(() => {
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });
  });

  it('should allow selecting multiple options', async () => {
    const user = userEvent.setup();

    render(<SpanListColumnsSelector options={mockOptions} onChange={mockOnChange} />);

    // Open the combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Select first option
    const durationOption = screen.getByText('Duration');
    await user.click(durationOption);

    expect(mockOnChange).toHaveBeenCalledWith('duration');

    // Select second option
    await user.click(combobox);
    const tagsOption = screen.getByText('Tags');
    await user.click(tagsOption);

    expect(mockOnChange).toHaveBeenCalledWith('duration,tags');
  });

  it('should display all available options when clicking the combobox', async () => {
    const user = userEvent.setup();

    render(<SpanListColumnsSelector options={mockOptions} onChange={mockOnChange} />);

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    mockOptions.forEach((option) => {
      if (option.label) {
        expect(screen.getByText(option.label)).toBeInTheDocument();
      }
    });
  });
});
