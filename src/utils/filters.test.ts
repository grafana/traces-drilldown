import { AdHocFiltersVariable } from '@grafana/scenes';
import { addToVariableFilters, toVariableFilter } from './filters';

describe('addToVariableFilters', () => {
  let variable: AdHocFiltersVariable;

  beforeEach(() => {
    variable = {
      state: { filters: [{ key: 'otherKey', operator: '=', value: 'value2' }] },
      setState: jest.fn(),
    } as unknown as AdHocFiltersVariable;
  });

  it('should add new filter and remove existing filter for the same key', () => {
    addToVariableFilters(variable, { key: 'newKey', value: 'newValue', operator: '=' });

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'newKey', operator: '=', value: 'newValue' },
      ],
    });
  });

  it('should keep span.db.system.name filter intact', () => {
    variable.state.filters.push({ key: 'span.db.system.name', operator: '=', value: 'value3' });
    addToVariableFilters(variable, { key: 'newKey', value: 'newValue', operator: '=' });

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

    addToVariableFilters(variable, { key: 'existingKey', value: 'newValue', operator: '=' }, true);

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'existingKey', operator: '=', value: 'existingValue' },
        { key: 'existingKey', operator: '=', value: 'newValue' },
      ],
    });
  });

  it('should add exclude filter with != operator', () => {
    addToVariableFilters(variable, { key: 'newKey', value: 'excludeValue', operator: '!=' });

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'newKey', operator: '!=', value: 'excludeValue' },
      ],
    });
  });

  it('should add regex include filter with =~ operator', () => {
    addToVariableFilters(variable, { key: 'event.exception.message', value: '^https?://\\\\S+$', operator: '=~' });

    expect(variable.setState).toHaveBeenCalledWith({
      filters: [
        { key: 'otherKey', operator: '=', value: 'value2' },
        { key: 'event.exception.message', operator: '=~', value: '^https?://\\\\S+$' },
      ],
    });
  });
});

describe('toVariableFilter', () => {
  it('should quote a plain string value and use it as the value label', () => {
    const filter = toVariableFilter({ key: 'span.foo', operator: '=', rawValue: 'bar' });

    expect(filter).toEqual({ key: 'span.foo', operator: '=', value: '"bar"', valueLabels: ['bar'] });
  });

  it('should keep a numeric value bare', () => {
    const filter = toVariableFilter({ key: 'span.foo', operator: '=', rawValue: '123' });

    expect(filter).toEqual({ key: 'span.foo', operator: '=', value: '123', valueLabels: ['123'] });
  });

  it('should keep a boolean value bare', () => {
    const filter = toVariableFilter({ key: 'span.foo', operator: '=', rawValue: 'true' });

    expect(filter).toEqual({ key: 'span.foo', operator: '=', value: 'true', valueLabels: ['true'] });
  });

  it('should strip outer quotes from an already-quoted value before re-quoting it', () => {
    const filter = toVariableFilter({ key: 'span.foo', operator: '=', rawValue: '"bar"' });

    expect(filter).toEqual({ key: 'span.foo', operator: '=', value: '"bar"', valueLabels: ['bar'] });
  });

  it('should always quote values for keys in the always-quoted list even when numeric', () => {
    const filter = toVariableFilter({
      key: 'span.messaging.destination.partition.id',
      operator: '=',
      rawValue: '100',
    });

    expect(filter).toEqual({
      key: 'span.messaging.destination.partition.id',
      operator: '=',
      value: '"100"',
      valueLabels: ['100'],
    });
  });

  it('should keep a known keyword value bare for keyword keys', () => {
    const filter = toVariableFilter({ key: 'status', operator: '=', rawValue: '"error"' });

    expect(filter).toEqual({ key: 'status', operator: '=', value: 'error', valueLabels: ['error'] });
  });

  it('should quote an unknown value for keyword keys', () => {
    const filter = toVariableFilter({ key: 'status', operator: '=', rawValue: 'weird' });

    expect(filter).toEqual({ key: 'status', operator: '=', value: '"weird"', valueLabels: ['weird'] });
  });

  it('should keep a valid duration value bare for duration keys', () => {
    const filter = toVariableFilter({ key: 'duration', operator: '=', rawValue: '100ms' });

    expect(filter).toEqual({ key: 'duration', operator: '=', value: '100ms', valueLabels: ['100ms'] });
  });

  it('should quote an invalid duration value for duration keys', () => {
    const filter = toVariableFilter({ key: 'duration', operator: '=', rawValue: 'abc' });

    expect(filter).toEqual({ key: 'duration', operator: '=', value: '"abc"', valueLabels: ['abc'] });
  });

  it('should escape double quotes inside a quoted value', () => {
    const filter = toVariableFilter({ key: 'span.foo', operator: '=', rawValue: 'say "hi" there' });

    expect(filter).toEqual({
      key: 'span.foo',
      operator: '=',
      value: '"say \\"hi\\" there"',
      valueLabels: ['say "hi" there'],
    });
  });

  it('should preserve the exclude operator', () => {
    const filter = toVariableFilter({ key: 'span.foo', operator: '!=', rawValue: 'bar' });

    expect(filter).toEqual({ key: 'span.foo', operator: '!=', value: '"bar"', valueLabels: ['bar'] });
  });

  it('should preserve the regex operator', () => {
    const filter = toVariableFilter({ key: 'span.foo', operator: '=~', rawValue: 'bar.*' });

    expect(filter).toEqual({ key: 'span.foo', operator: '=~', value: '"bar.*"', valueLabels: ['bar.*'] });
  });
});
