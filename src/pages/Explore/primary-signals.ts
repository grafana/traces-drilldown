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
  {
    label: 'Server spans',
    value: 'kind=server',
    filter: { key: 'kind', operator: '=', value: 'server' },
    description: 'Explore server-specific segments of traces',
  },
  {
    label: 'Consumer spans',
    value: 'kind=consumer',
    filter: { key: 'kind', operator: '=', value: 'consumer' },
    description: 'Analyze interactions initiated by consumer services',
  },
  {
    label: 'Database calls',
    value: `${DATABASE_CALLS_KEY}!=""`,
    filter: { key: DATABASE_CALLS_KEY, operator: '!=', value: '""' },
    description: 'Evaluate the performance issues in database interactions',
  },
];

export const getSignalForKey = (key?: string) => {
  return primarySignalOptions.find((option) => option.value === key);
};
