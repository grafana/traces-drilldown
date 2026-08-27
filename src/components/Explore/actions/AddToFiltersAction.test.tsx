import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { AddToFiltersAction, addToFilters, newAddToFilters } from './AddToFiltersAction';
import { DataFrame, FieldType } from '@grafana/data';
import { AdHocFiltersVariable } from '@grafana/scenes';
import { useFlagUseValueTypeFiltering } from '../../../featureFlags/featureFlags';

jest.mock('../../../utils/utils', () => {
  const actual = jest.requireActual('../../../utils/utils');
  return {
    getFiltersVariable: jest.fn(),
    getLabelValue: jest.fn(),
    getLabelValueType: (value: unknown, key?: string) => actual.getLabelValueType(value, key),
    getRawLabelValue: (frame: unknown, labelName?: string) => actual.getRawLabelValue(frame, labelName),
    stripOuterQuotes: (value: string) => actual.stripOuterQuotes(value),
    toEscapedValue: (valueType: unknown, value: string) => actual.toEscapedValue(valueType, value),
  };
});

jest.mock('../../../featureFlags/featureFlags', () => ({
  useFlagUseValueTypeFiltering: jest.fn(),
}));

const mockUseFlagUseValueTypeFiltering = jest.mocked(useFlagUseValueTypeFiltering);

const mockGetFiltersVariable = require('../../../utils/utils').getFiltersVariable;
const mockGetLabelValue = require('../../../utils/utils').getLabelValue;

describe('AddToFiltersAction without useFlagUseValueTypeFiltering', () => {
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
    mockUseFlagUseValueTypeFiltering.mockReturnValue(false);
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
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'nonExistentLabel' });
    action.onIncludeClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should not add exclude filter when labelKey is provided and does not exist in labels', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'nonExistentLabel' });
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

describe('AddToFiltersAction with useFlagUseValueTypeFiltering', () => {
  let variable: AdHocFiltersVariable;
  let onClick: jest.Mock;
  let frame: DataFrame;

  beforeEach(() => {
    jest.resetAllMocks();
    variable = {
      state: { filters: [] },
      setState: jest.fn(),
    } as unknown as AdHocFiltersVariable;

    frame = {
      fields: [
        {
          labels: { label1: '"value1"', label2: 'value2' },
          type: 'number',
        },
      ],
    } as unknown as DataFrame;

    onClick = jest.fn();
    mockGetFiltersVariable.mockReturnValue(variable);
    mockUseFlagUseValueTypeFiltering.mockReturnValue(true);
  });

  it('should render both Include and Exclude buttons', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    const { getByRole } = render(<AddToFiltersAction.Component model={action} />);

    expect(getByRole('button', { name: /include/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /exclude/i })).toBeInTheDocument();
  });

  it('should add include filter when labelKey is provided and exists in labels', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: '"value1"', valueLabels: ['value1'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should add exclude filter when labelKey is provided and exists in labels', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    action.newOnExcludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '!=', value: '"value1"', valueLabels: ['value1'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should not add include filter when labelKey is provided and does not exist in labels', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'nonExistentLabel' });
    action.newOnIncludeClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should not add exclude filter when labelKey is provided and does not exist in labels', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'nonExistentLabel' });
    action.newOnExcludeClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should add include filter when no labelKey and exactly one label exists', () => {
    const action = new AddToFiltersAction({ frame, onClick });
    frame.fields[0].labels = { label1: '"value1"' };
    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: '"value1"', valueLabels: ['value1'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should add exclude filter when no labelKey and exactly one label exists', () => {
    const action = new AddToFiltersAction({ frame, onClick });
    frame.fields[0].labels = { label1: '"value1"' };
    action.newOnExcludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '!=', value: '"value1"', valueLabels: ['value1'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should not add filter when no labelKey and more than one label exists', () => {
    const action = new AddToFiltersAction({ frame, onClick });
    action.newOnIncludeClick();

    expect(variable.setState).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should trigger onIncludeClick when Include button is clicked', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    const onIncludeClickSpy = jest.spyOn(action, 'newOnIncludeClick');
    const { getByRole } = render(<AddToFiltersAction.Component model={action} />);

    const includeButton = getByRole('button', { name: /include/i });
    fireEvent.click(includeButton);

    expect(onIncludeClickSpy).toHaveBeenCalled();
  });

  it('should trigger onExcludeClick when Exclude button is clicked', () => {
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });
    const onExcludeClickSpy = jest.spyOn(action, 'newOnExcludeClick');
    const { getByRole } = render(<AddToFiltersAction.Component model={action} />);

    const excludeButton = getByRole('button', { name: /exclude/i });
    fireEvent.click(excludeButton);

    expect(onExcludeClickSpy).toHaveBeenCalled();
  });

  it('should store a bare numeric value unquoted, with valueLabels', () => {
    frame.fields[0].labels = { label1: '116' };
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });

    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: '116', valueLabels: ['116'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should force quotes for ALWAYS_QUOTED keys even when the raw value is bare', () => {
    frame.fields[0].labels = { 'span.network.protocol.version': '1.1' };
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'span.network.protocol.version' });

    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'span.network.protocol.version', operator: '=', value: '"1.1"', valueLabels: ['1.1'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'span.network.protocol.version' });
  });

  it('should keep keyword status values bare', () => {
    frame.fields[0].labels = { status: 'error' };
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'status' });

    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'status', operator: '=', value: 'error', valueLabels: ['error'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'status' });
  });

  it('should keep duration values bare', () => {
    frame.fields[0].labels = { duration: '1s' };
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'duration' });

    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'duration', operator: '=', value: '1s', valueLabels: ['1s'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'duration' });
  });

  it('should strip outer quotes and escape embedded quotes for quoted values', () => {
    frame.fields[0].labels = { label1: '"say "hi""' };
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });

    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: '"say \\"hi\\""', valueLabels: ['say "hi"'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should escape embedded newlines for quoted values', () => {
    frame.fields[0].labels = { label1: '"a\nb"' };
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });

    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: '"a\\nb"', valueLabels: ['a\nb'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should store an unknown-typed value escaped', () => {
    frame.fields[0].labels = { label1: 'prod' };
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });

    action.newOnIncludeClick();

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [{ key: 'label1', operator: '=', value: '"prod"', valueLabels: ['prod'] }],
    });
    expect(onClick).toHaveBeenCalledWith({ labelName: 'label1' });
  });

  it('should ignore the click when the frame has no number field to read the value from', () => {
    frame.fields[0].type = FieldType.string;
    frame.fields[0].labels = { label1: 'value1' };
    const action = new AddToFiltersAction({ frame, onClick, labelKey: 'label1' });

    action.newOnIncludeClick();

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
    variable.state.filters = [{ key: 'existingKey', operator: '=', value: 'existingValue' }];

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

  it('should add regex include filter with =~ operator', () => {
    addToFilters(variable, 'event.exception.message', '^https?://\\\\S+$', '=~');

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'event.exception.message', operator: '=~', value: '^https?://\\\\S+$' },
      ],
    });
  });
});

describe('newAddToFilters', () => {
  let variable: AdHocFiltersVariable;

  beforeEach(() => {
    variable = {
      state: { filters: [{ key: 'otherKey', operator: '=', value: 'value2' }] },
      setState: jest.fn(),
    } as unknown as AdHocFiltersVariable;
  });

  it('should add new filter and remove existing filter for the same key', () => {
    newAddToFilters(variable, { key: 'newKey', value: 'newValue', operator: '=' });

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'newKey', operator: '=', value: 'newValue' },
      ],
    });
  });

  it('should keep span.db.system.name filter intact', () => {
    variable.state.filters.push({ key: 'span.db.system.name', operator: '=', value: 'value3' });
    newAddToFilters(variable, { key: 'newKey', value: 'newValue', operator: '=' });

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'span.db.system.name', operator: '=', value: 'value3' },
        { key: 'newKey', operator: '=', value: 'newValue' },
      ],
    });
  });

  it('should append filter when append is true', () => {
    variable.state.filters = [{ key: 'existingKey', operator: '=', value: 'existingValue' }];

    newAddToFilters(variable, { key: 'existingKey', value: 'newValue', operator: '=' }, true);

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'existingKey', operator: '=', value: 'existingValue' },
        { key: 'existingKey', operator: '=', value: 'newValue' },
      ],
    });
  });

  it('should add exclude filter with != operator', () => {
    newAddToFilters(variable, { key: 'newKey', value: 'excludeValue', operator: '!=' });

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'newKey', operator: '!=', value: 'excludeValue' },
      ],
    });
  });

  it('should add regex include filter with =~ operator', () => {
    newAddToFilters(variable, { key: 'event.exception.message', value: '^https?://\\\\S+$', operator: '=~' });

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'event.exception.message', operator: '=~', value: '^https?://\\\\S+$' },
      ],
    });
  });
});
