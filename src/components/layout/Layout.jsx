import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useProjects } from '../../hooks/useProjects';
import { createContext } from 'react';

export const ProjectsContext = createContext({ projects: [], refresh: () => {} });

export default function Layout() {
  const { projects, loading, refresh, createProject, removeProject } = useProjects();

  return (
    <ProjectsContext.Provider value={{ projects, loading, refresh, removeProject }}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar projects={projects} onCreateProject={createProject} onDeleteProject={removeProject} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header />
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ProjectsContext.Provider>
  );
}
