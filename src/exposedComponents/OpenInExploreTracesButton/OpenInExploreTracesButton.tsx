import { useReturnToPrevious } from '@grafana/runtime';
import { LinkButton } from '@grafana/ui';
import React, { useMemo } from 'react';
import { OpenInExploreTracesButtonProps } from '../types';
import pluginJson from '../../plugin.json';

export default function OpenInExploreTracesButton({
  datasourceUid,
  matchers,
  from,
  to,
  returnToPreviousSource,
  renderButton,
}: OpenInExploreTracesButtonProps) {
  const setReturnToPrevious = useReturnToPrevious();

  const href = useMemo(() => {
    let params = new URLSearchParams();

    if (datasourceUid) {
      params.append('var-ds', datasourceUid);
    }

    if (from) {
      params.append('from', from);
    }

    if (to) {
      params.append('to', to);
    }

    matchers.forEach((streamSelector) => {
      params.append('var-filters', `${streamSelector.name}|${streamSelector.operator}|${streamSelector.value}`);
    });

    params.append('var-primarySignal', 'true'); // so all spans is selected

    return `a/${pluginJson.id}/explore?${params.toString()}`;
  }, [datasourceUid, from, to, matchers]);

  if (!href) {
    return null;
  }

  if (renderButton) {
    return renderButton({ href });
  }

  return (
    <LinkButton
      variant="secondary"
      href={href}
      onClick={() => setReturnToPrevious(returnToPreviousSource || 'previous')}
    >
      Open in Traces Drilldown
    </LinkButton>
  );
}
