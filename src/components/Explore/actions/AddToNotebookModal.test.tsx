import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { config, usePluginComponent } from '@grafana/runtime';

import { AddToNotebookModal } from './AddToNotebookModal';
import { ADD_TO_NOTEBOOK_COMPONENT_ID, type AddToNotebookFormProps, type NotebookCapture } from './addToNotebook';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  usePluginComponent: jest.fn(),
}));
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Modal: ({ children, onDismiss }: React.PropsWithChildren<{ onDismiss: () => void }>) => (
    <div>
      <button onClick={onDismiss}>Dismiss</button>
      {children}
    </div>
  ),
}));

const capture: NotebookCapture = {
  panel: {
    type: 'timeseries',
    targets: [{ refId: 'A', query: '{} | rate()' }],
    datasource: { uid: 'tempo-production' },
  },
  capturedTimeRange: { from: 'now-1h', to: 'now', timeZone: 'utc' },
};

describe('AddToNotebookModal', () => {
  const originalPermissions = config.bootData.user.permissions;
  beforeEach(() => {
    config.bootData.user.permissions = { 'notebooks:write': true };
  });
  afterEach(() => {
    config.bootData.user.permissions = originalPermissions;
  });

  it.each([
    [true, true, true],
    [false, false, true],
    [false, true, false],
  ])('hides for loading=%s, present=%s, permission=%s', (isLoading, present, permission) => {
    config.bootData.user.permissions = permission ? { 'notebooks:create': true } : {};
    jest.mocked(usePluginComponent).mockReturnValue({ isLoading, component: present ? () => <div>Form</div> : null });
    const { container } = render(<AddToNotebookModal capture={capture} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('passes the v1 frozen panel and window, and closes through form or modal', () => {
    let formProps: AddToNotebookFormProps | undefined;
    const Form = (props: AddToNotebookFormProps) => {
      formProps = props;
      return <button onClick={props.onClose}>Cancel</button>;
    };
    jest.mocked(usePluginComponent<AddToNotebookFormProps>).mockReturnValue({ isLoading: false, component: Form });
    const onClose = jest.fn();
    render(<AddToNotebookModal capture={capture} onClose={onClose} />);
    expect(usePluginComponent).toHaveBeenCalledWith(ADD_TO_NOTEBOOK_COMPONENT_ID);
    expect(formProps?.capturedTimeRange).toEqual(capture.capturedTimeRange);
    expect(formProps?.buildPanel()).toEqual(capture.panel);
    const changed = formProps?.buildPanel();
    changed!.targets![0].query = 'changed by host';
    expect(formProps?.buildPanel()).toEqual(capture.panel);
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
