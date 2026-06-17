import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { SearchView } from './views/SearchView';
import { DashboardView } from './views/DashboardView';
import { HistoryView } from './views/HistoryView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardView /> },
      { path: 'search', element: <SearchView /> },
      { path: 'history', element: <HistoryView /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
