import React from 'react';
import { t } from '@grafana/i18n';
import { usePluginComponent } from '@grafana/runtime';
import { Modal } from '@grafana/ui';

import {
  ADD_TO_NOTEBOOK_COMPONENT_ID,
  type AddToNotebookFormProps,
  type NotebookCapture,
  canAddToNotebook,
  cloneNotebookPanel,
} from './addToNotebook';

export function useNotebookForm() {
  const { component, isLoading } = usePluginComponent<AddToNotebookFormProps>(ADD_TO_NOTEBOOK_COMPONENT_ID);
  return !isLoading && canAddToNotebook() ? component : null;
}

export function AddToNotebookModal({ capture, onClose }: { capture: NotebookCapture; onClose: () => void }) {
  const Form = useNotebookForm();
  if (!Form) {
    return null;
  }
  return (
    <Modal title={t('panel-menu.add-to-notebook', 'Add to notebook')} isOpen onDismiss={onClose}>
      {React.createElement(Form, {
        onClose,
        capturedTimeRange: capture.capturedTimeRange,
        buildPanel: () => cloneNotebookPanel(capture.panel),
      })}
    </Modal>
  );
}
