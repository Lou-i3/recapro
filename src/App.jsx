import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import TasksByProjectPage from './pages/TasksByProjectPage';
import TasksInProgressPage from './pages/TasksInProgressPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tasks/by-project" element={<TasksByProjectPage />} />
        <Route path="tasks/in-progress" element={<TasksInProgressPage />} />
        <Route path="project/:slug" element={<ProjectPage />} />
      </Route>
    </Routes>
  );
}
