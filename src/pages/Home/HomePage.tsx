import React, { useEffect, useState } from 'react';
import { newHome } from '../../utils/utils';
import { DATASOURCE_LS_KEY, HOMEPAGE_FILTERS_LS_KEY } from '../../utils/shared';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../utils/analytics';
import { Home } from './Home';

const HomePage = () => {
  const initialDs = localStorage.getItem(DATASOURCE_LS_KEY) || '';
  const localStorageFilters = localStorage.getItem(HOMEPAGE_FILTERS_LS_KEY);
  const filters = localStorageFilters ? JSON.parse(localStorageFilters) : [];
  const [home] = useState(newHome(filters, initialDs));

  return <HomeView home={home} />;
};

export default HomePage;

export function HomeView({ home }: { home: Home }) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);

      reportAppInteraction(USER_EVENTS_PAGES.home, USER_EVENTS_ACTIONS.home.homepage_initialized);
    }
  }, [home, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  return (
    <home.Component model={home} />
  );
}
