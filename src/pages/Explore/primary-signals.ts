import { SelectableValue } from '@grafana/data';

export const DATABASE_CALLS_KEY = 'span.db.name';

export const primarySignalOptions: Array<SelectableValue<string>> = [
  {
    label: 'Root spans',
    value: 'nestedSetParent<0',
    filter: { key: 'nestedSetParent', operator: '<', value: '0' },
    description: 'Focus your analysis on the root span of each trace',
  },
  {
    label: 'All spans',
    value: 'true',
    filter: { key: '', operator: '', value: true },
    description: 'View and analyse raw span data. This option may result in long query times.',
  },
];

export const getSignalForKey = (key?: string) => {
  return primarySignalOptions.find((option) => option.value === key);
};
