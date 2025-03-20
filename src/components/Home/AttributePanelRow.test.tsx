import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttributePanelRow } from './AttributePanelRow';
import { locationService } from '@grafana/runtime';
import { HomepagePanelType } from './AttributePanel';

jest.mock('@grafana/runtime', () => ({
  locationService: {
    push: jest.fn(),
  },
}));

jest.mock('utils/analytics', () => ({
  reportAppInteraction: jest.fn(),
  USER_EVENTS_ACTIONS: {
    home: {
      attribute_panel_item_clicked: 'attribute_panel_item_clicked',
    },
  },
  USER_EVENTS_PAGES: {
    home: 'home',
  },
}));

describe('AttributePanelRow', () => {
  const mockProps = {
    index: 0,
    type: 'errored-services' as HomepagePanelType,
    label: 'Test Label',
    labelTitle: 'Label Title',
    value: 'Test Text',
    valueTitle: 'Text Title',
    url: '/test-url',
  };

  it('renders correctly with required props', () => {
    render(<AttributePanelRow {...mockProps} />);

    expect(screen.getByText(mockProps.labelTitle)).toBeInTheDocument();
    expect(screen.getByText(mockProps.valueTitle)).toBeInTheDocument();
    expect(screen.getByText(mockProps.label)).toBeInTheDocument();
    expect(screen.getByText(mockProps.value)).toBeInTheDocument();
  });

  it('navigates to the correct URL on click', () => {
    render(<AttributePanelRow {...mockProps} />);
    const rowElement = screen.getByText(mockProps.label).closest('div');
    fireEvent.click(rowElement!);
    expect(locationService.push).toHaveBeenCalledWith(mockProps.url);
  });

  it('renders the row header only if index is 0', () => {
    render(<AttributePanelRow {...mockProps} />);
    expect(screen.getByText(mockProps.labelTitle)).toBeInTheDocument();
  });

  it('does not render the row header only if index is > 0', () => {
    render(<AttributePanelRow {...{ ...mockProps, index: 1 }} />);
    expect(screen.queryByText(mockProps.labelTitle)).not.toBeInTheDocument();
  });
});
