import React from 'react';
import { render, screen } from '@testing-library/react';
import { AttributePanelRows } from './AttributePanelRows';
import { DataFrame, Field } from '@grafana/data';

describe('AttributePanelRows', () => {
  const createField = (name: string, values: any[], labels: Record<string, string> = {}, type?: string) =>
    ({
      name,
      values,
      labels,
      type,
    }) as Field;

  const createDataFrame = (fields: Field[]) =>
    ({
      fields,
    }) as DataFrame;

  const dummySeries = [
    createDataFrame([
      createField('time', []),
      createField('Test service 1', [10, 20], { 'resource.service.name': '"Test service 1"' }, 'number'),
    ]),
    createDataFrame([
      createField('time', []),
      createField('Test service 2', [15, 5], { 'resource.service.name': '"Test service 2"' }, 'number'),
    ]),
  ];

  const dummyDurationSeries = [
    createDataFrame([
      createField('traceIdHidden', ['trace-1', 'trace-2']),
      createField('spanID', ['span-1', 'span-2']),
      createField('traceName', ['Test name 1', 'Test name 2']),
      createField('traceService', ['Test service 1', 'Test service 2']),
      createField('duration', [3000, 500]),
    ]),
  ];

  it('renders message if provided', () => {
    const msg = 'No data available.';
    render(<AttributePanelRows series={[]} type={'errored-services'} message={msg} />);
    expect(screen.getByText(msg)).toBeInTheDocument();
  });

  it('renders an empty container if no series or message is provided', () => {
    render(<AttributePanelRows series={[]} type={'errored-services'} />);
    expect(screen.getByText('No series data')).toBeInTheDocument();
  });

  it('renders error rows sorted by total errors when type is "errors"', () => {
    render(<AttributePanelRows series={dummySeries} type={'errored-services'} />);

    expect(screen.getAllByText('Total errors').length).toBe(1);

    const labels = screen.getAllByText('Test service', { exact: false });
    expect(labels[0].textContent).toContain('Test service 1');
    expect(labels[1].textContent).toContain('Test service 2');
  });

  it('renders duration rows sorted by duration when type is not "errors"', () => {
    render(<AttributePanelRows series={dummyDurationSeries} type={'slowest-traces'} />);

    expect(screen.getAllByText('Duration').length).toBe(1);

    const labels = screen.getAllByText('Test', { exact: false });
    expect(labels[0].textContent).toContain('Test service 1: Test name 1');
    expect(labels[1].textContent).toContain('Test service 2: Test name 2');
  });
});
