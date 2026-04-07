import React from 'react';
import { render, fireEvent } from '@testing-library/react'; 
import { AddToFiltersAction, addToFilters } from './AddToFiltersAction';
import { DataFrame } from '@grafana/data';
import { AdHocFiltersVariable } from '@grafana/scenes';

jest.mock('../../../utils/utils');

const mockGetFiltersVariable = require('../../../utils/utils').getFiltersVariable;
const mockGetLabelValue = require('../../../utils/utils').getLabelValue;

describe('AddToFiltersAction', () => {
  let variable: AdHocFiltersVariable;
  let onClick: jest.Mock;
  let frame: DataFrame;

  beforeEach(() => {
    variable = {
      state: { filters: [] },
      setState: jest.fn(),
    } as unknown as AdHocFiltersVariable;
    
    frame = {
      fields: [
        {
          labels: { label1: 'value1', label2: 'value2' },
          type: 'string',
        },
      ],
    } as unknown as DataFrame; 
    
    onClick = jest.fn();
    mockGetFiltersVariable.mockReturnValue(variable);
    mockGetLabelValue.mockReturnValue('value1'); 
  });

  it('should render both Include and Exclude buttons', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    const { getByRole } = render(<AddToFiltersAction.Component model={action} />);
    
    expect(getByRole('button', { name: /include/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /exclude/i })).toBeInTheDocument();
  });

  it('should add include filter when labelKey is provided and exists in labels', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    action.onIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: 'value1' }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should add exclude filter when labelKey is provided and exists in labels', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    action.onExcludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '!=', value: 'value1' }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should not add include filter when labelKey is provided and does not exist in labels', () => {
    const action = new AddToFiltersAction({frame, onClick, labelKey: 'nonExistentLabel'});
    action.onIncludeClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should not add exclude filter when labelKey is provided and does not exist in labels', () => {
    const action = new AddToFiltersAction({frame, onClick, labelKey: 'nonExistentLabel'});
    action.onExcludeClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should add include filter when no labelKey and exactly one label exists', () => {
    const action = new AddToFiltersAction({ frame, onClick });
    frame.fields[0].labels = { label1: 'value1' };
    action.onIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: 'value1' }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should add exclude filter when no labelKey and exactly one label exists', () => {
    const action = new AddToFiltersAction({ frame, onClick });
    frame.fields[0].labels = { label1: 'value1' };
    action.onExcludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '!=', value: 'value1' }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should not add filter when no labelKey and more than one label exists', () => {
    const action = new AddToFiltersAction({ frame, onClick });
    action.onIncludeClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should trigger onIncludeClick when Include button is clicked', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    const onIncludeClickSpy = jest.spyOn(action, 'onIncludeClick');
    const { getByRole } = render(<AddToFiltersAction.Component model={action} />);
    
    const includeButton = getByRole('button', { name: /include/i });
    fireEvent.click(includeButton);
    
    expect(onIncludeClickSpy).toHaveBeenCalled();
  });

  it('should trigger onExcludeClick when Exclude button is clicked', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    const onExcludeClickSpy = jest.spyOn(action, 'onExcludeClick');
    const { getByRole } = render(<AddToFiltersAction.Component model={action} />);
    
    const excludeButton = getByRole('button', { name: /exclude/i });
    fireEvent.click(excludeButton);
    
    expect(onExcludeClickSpy).toHaveBeenCalled();
  });
});

describe('addToFilters', () => {
  let variable: AdHocFiltersVariable;

  beforeEach(() => {
    variable = {
      state: { filters: [{ key: 'otherKey', operator: '=', value: 'value2' }] },
      setState: jest.fn(),
    } as unknown as AdHocFiltersVariable;
  });

  it('should add new filter and remove existing filter for the same key', () => {
    addToFilters(variable, 'newKey', 'newValue');

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'newKey', operator: '=', value: 'newValue' },
      ],
    });
  });

  it('should keep span.db.system.name filter intact', () => {
    variable.state.filters.push({ key: 'span.db.system.name', operator: '=', value: 'value3' });
    addToFilters(variable, 'newKey', 'newValue');

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'span.db.system.name', operator: '=', value: 'value3' },
        { key: 'newKey', operator: '=', value: 'newValue' },
      ],
    });
  });

  it('should append filter when append is true', () => {
    variable.state.filters = [
      { key: 'existingKey', operator: '=', value: 'existingValue' },
    ];
    
    addToFilters(variable, 'existingKey', 'newValue', '=', true);

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'existingKey', operator: '=', value: 'existingValue' },
        { key: 'existingKey', operator: '=', value: 'newValue' },
      ],
    });
  });

  it('should add exclude filter with != operator', () => {
    addToFilters(variable, 'newKey', 'excludeValue', '!=');

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'newKey', operator: '!=', value: 'excludeValue' },
      ],
    });
  });
});
