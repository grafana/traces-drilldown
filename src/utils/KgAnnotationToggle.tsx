import React from 'react';
import { ControlsLabel, SceneDataLayerSet, SceneObjectBase, SceneObjectRef, SceneObjectState } from '@grafana/scenes';
import { InlineSwitch } from '@grafana/ui';
import { t } from '@grafana/i18n';

export interface KgAnnotationToggleState extends SceneObjectState {
  isEnabled: boolean;
  layerSetRef: SceneObjectRef<SceneDataLayerSet>;
}

export class KgAnnotationToggle extends SceneObjectBase<KgAnnotationToggleState> {
  static Component = KgAnnotationToggleRenderer;

  public toggleEnabled = () => {
    const next = !this.state.isEnabled;
    this.setState({ isEnabled: next });
    for (const layer of this.state.layerSetRef.resolve().state.layers) {
      layer.setState({ isEnabled: next });
    }
  };

  public syncLayerEnabledState = () => {
    for (const layer of this.state.layerSetRef.resolve().state.layers) {
      layer.setState({ isEnabled: this.state.isEnabled });
    }
  };
}

function KgAnnotationToggleRenderer({ model }: { model: KgAnnotationToggle }) {
  const { isEnabled, layerSetRef } = model.useState();
  const { layers } = layerSetRef.resolve().useState();

  if (layers.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignSelf: 'flex-end' }}>
      <ControlsLabel
        label={t('kg-annotation-toggle.label', 'Insights')}
        description={t(
          'kg-annotation-toggle.description',
          'Overlay health states (critical, warning, info) from the Knowledge Graph on timeseries panels'
        )}
      />
      <InlineSwitch
        value={isEnabled}
        onChange={model.toggleEnabled}
        aria-label={t('kg-annotation-toggle.aria-label', 'Insights')}
      />
    </div>
  );
}
