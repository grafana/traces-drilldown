import React, { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from 'utils/shared';

const HomePage = lazy(() => import('../../pages/Home/HomePage'));
const TraceExplorationPage = lazy(() => import('../../pages/Explore/TraceExplorationPage'));

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path={ROUTES.Explore} element={<TraceExplorationPage />} />
      <Route path={ROUTES.Home} element={<HomePage />} />
      <Route path={'/'} element={<Navigate replace to={ROUTES.Home} />} />
    </Routes>
  );
};
