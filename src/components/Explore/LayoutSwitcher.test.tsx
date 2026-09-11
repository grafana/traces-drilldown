import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutSwitcher, LayoutType, LayoutSwitcherState } from './LayoutSwitcher';
import { SelectableValue } from '@grafana/data';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';
import { SceneObject } from '@grafana/scenes';

jest.mock('../../utils/analytics', () => ({
  reportAppInteraction: jest.fn(),
  USER_EVENTS_ACTIONS: { analyse_traces: { layout_type_changed: 'layout_type_changed' } },
  USER_EVENTS_PAGES: { analyse_traces: 'analyse_traces' },
}));

const options: Array<SelectableValue<LayoutType>> = [
  { label: 'Single', value: 'single' },
  { label: 'Grid', value: 'grid' },
  { label: 'Rows', value: 'rows' },
];

const layouts = [
  { Component: () => <div>Single Layout</div>, state: {} },
  { Component: () => <div>Grid Layout</div>, state: {} },
  { Component: () => <div>Rows Layout</div>, state: {} },
] as unknown as SceneObject[];

const initialState: LayoutSwitcherState = {
  active: 'single',
  layouts,
  options,
};

describe('LayoutSwitcher', () => {
  let layoutSwitcher: LayoutSwitcher;

  beforeEach(() => {
    layoutSwitcher = new LayoutSwitcher(initialState);
  });

  it('renders the Selector with correct options and active state', () => {
    render(<layoutSwitcher.Selector model={layoutSwitcher} />);

    expect(screen.getByText('Single')).toBeInTheDocument();
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText('Rows')).toBeInTheDocument();
  });

  it('changes layout on layout change and reports interaction', () => {
    render(<layoutSwitcher.Selector model={layoutSwitcher} />);

    fireEvent.click(screen.getByText('Grid'));

    expect(layoutSwitcher.state.active).toBe('grid');
    expect(reportAppInteraction).toHaveBeenCalledWith(
      USER_EVENTS_PAGES.analyse_traces,
      USER_EVENTS_ACTIONS.analyse_traces.layout_type_changed,
      { layout: 'grid' }
    );
  });

  it('calls the correct layout component based on the active state', () => {
    const mockOnLayoutChange = jest.fn();
    class TestLayoutSwitcher extends LayoutSwitcher {
      public onLayoutChange = mockOnLayoutChange;
    }
    const model = new TestLayoutSwitcher(initialState) as unknown as LayoutSwitcher;
    render(<model.Selector model={model} />);

    fireEvent.click(screen.getByText('Grid'));
    expect(mockOnLayoutChange).toHaveBeenCalledWith('grid');
  });

  it('renders the correct layout component based on the active state', () => {
    layoutSwitcher.setState({ active: 'grid' });
    const { container } = render(<LayoutSwitcher.Component model={layoutSwitcher} />);
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText('Grid Layout')).toBeDefined();
  });

  it('returns null when the active layout option is invalid', () => {
    layoutSwitcher.setState({ active: 'invalid' as LayoutType });
    const { container } = render(<LayoutSwitcher.Component model={layoutSwitcher} />);
    expect(container.firstChild).toBeNull();
  });
});
