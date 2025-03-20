import React, { useEffect, useState } from 'react';
import z from 'zod';

import { newTracesExploration } from '../../utils/utils';
import { TraceExploration } from './TraceExploration';
import { DATASOURCE_LS_KEY } from '../../utils/shared';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';
import { UrlSyncContextProvider } from '@grafana/scenes';
import { AdHocVariableFilter } from '@grafana/data';

import {
  // @ts-ignore new API that is not yet in stable release
  useSidecar_EXPERIMENTAL,
  useLocationService,
} from '@grafana/runtime';

const TraceExplorationPage = () => {
  // We are calling this conditionally, but it will depend on grafana version and should not change in runtime so we
  // can ignore the hook rule here
  const sidecarContext = useSidecar_EXPERIMENTAL?.() ?? {};
  const locationService = useLocationService();

  const initialDs = localStorage.getItem(DATASOURCE_LS_KEY) || '';
  const [exploration] = useState(newTracesExploration(locationService, initialDs, getInitialFilters(sidecarContext.initialContext)));

  return <TraceExplorationView exploration={exploration} />;
};

export default TraceExplorationPage;

export function TraceExplorationView({ exploration }: { exploration: TraceExploration }) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);

      reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.app_initialized);
    }
  }, [exploration, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  return (
    <UrlSyncContextProvider scene={exploration} updateUrlOnInit={true} createBrowserHistorySteps={true}>
      <exploration.Component model={exploration} />
    </UrlSyncContextProvider>
  );
}

const AdHocVariableFilterSchema = z.object({
  key: z.string(),
  operator: z.string(),
  value: z.string(),
});

const InitialFiltersSchema = z.object({
  filters: z.array(AdHocVariableFilterSchema),
});

/** Because the context comes from a different app plugin we cannot really count on it being the correct type even if
 * it was typed, so it is safer to do runtime parsing here. It also can come from different app extensions and at this
 * point we don't know which, but we also have implemented only one so far it's a fair guess.
 *
 * At this point there is no smartness. What ever we got from the other app we use as is. Ideally there should be some
 * normalization of the filters or smart guesses when there are differences.
 * @param context
 */
function getInitialFilters(context: unknown): AdHocVariableFilter[] | undefined {
  const result = InitialFiltersSchema.safeParse(context);
  if (!result.success) {
    return undefined;
  }

  return result.data.filters;
}
