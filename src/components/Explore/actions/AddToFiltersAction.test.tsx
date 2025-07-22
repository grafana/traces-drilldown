import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react'; 
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
        },
      ],
    } as unknown as DataFrame; 
    
    onClick = jest.fn();
    mockGetFiltersVariable.mockReturnValue(variable);
    mockGetLabelValue.mockReturnValue('value1'); 
  });

  it('should render the button and trigger onClick', async () => {
    const { getByRole } = render(<AddToFiltersAction.Component model={{ onClick } as any} />);
    await waitFor(() => {
      const button = getByRole('button', { name: /add to filters/i });
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalled();
    });
  });

  it('should add filter when labelKey is provided and exists in labels', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    action.onClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: 'value1' }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should not add filter when labelKey is provided and does not exist in labels', () => {
    const action = new AddToFiltersAction({frame, onClick, labelKey: 'nonExistentLabel'});
    action.onClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should add filter when no labelKey and exactly one label exists', () => {
    const action = new AddToFiltersAction({ frame, onClick });
    frame.fields[0].labels = { label1: 'value1' };
    action.onClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: 'value1' }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should not add filter when no labelKey and more than one label exists', () => {
    const action = new AddToFiltersAction({ frame, onClick });
    action.onClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
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

  // it('should keep span.db.system.name filter intact', () => {
  //   variable.state.filters.push({ key: 'span.db.system.name', operator: '=', value: 'value3' });
  //   addToFilters(variable, 'newKey', 'newValue');

  //   expect(variable.setState).toHaveBeenCalledWith({
  //     filters: [
  //       { key: 'otherKey', operator: '=', value: 'value2' },
  //       { key: 'span.db.system.name', operator: '=', value: 'value3' },
  //       { key: 'newKey', operator: '=', value: 'newValue' },
  //     ],
  //   });
  // });
});
