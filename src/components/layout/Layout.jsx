import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useProjects } from '../../hooks/useProjects';
import { createContext, useState } from 'react';
import { colors, transitions } from '../../lib/theme';

export const ProjectsContext = createContext({ projects: [], refresh: () => {} });
export const LayoutContext = createContext({ sidebarOpen: true, toggleSidebar: () => {} });

export default function Layout() {
  const { projects, loading, refresh, createProject, removeProject } = useProjects();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <ProjectsContext.Provider value={{ projects, loading, refresh, removeProject }}>
      <LayoutContext.Provider value={{ sidebarOpen, toggleSidebar }}>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <div style={{
            width: sidebarOpen ? 230 : 0,
            minWidth: sidebarOpen ? 230 : 0,
            overflow: 'hidden',
            transition: 'width 0.2s ease, min-width 0.2s ease',
          }}>
            <Sidebar projects={projects} onCreateProject={createProject} onDeleteProject={removeProject} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header />
            <main style={{ flex: 1, overflow: 'auto' }}>
              <Outlet />
            </main>
          </div>
        </div>
      </LayoutContext.Provider>
    </ProjectsContext.Provider>
  );
}
