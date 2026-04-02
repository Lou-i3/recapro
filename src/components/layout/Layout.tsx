'use client';

import Sidebar from './Sidebar';
import { useProjects } from '../../hooks/useProjects';
import { createContext, useState } from 'react';
import { colors, spacing, radii, transitions, fonts, fontSizes } from '../../lib/theme';
import type { ProjectsContextValue, LayoutContextValue } from '../../types';

export const ProjectsContext = createContext<ProjectsContextValue>({
  projects: [], loading: false, refresh: async () => {}, removeProject: async () => {},
});
export const LayoutContext = createContext<LayoutContextValue>({
  sidebarOpen: true, toggleSidebar: () => {},
});

export default function Layout({ children }: { children: React.ReactNode }) {
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
            <Sidebar
              projects={projects}
              onCreateProject={createProject}
              onDeleteProject={removeProject}
              onCollapse={toggleSidebar}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {!sidebarOpen && (
              <button
                onClick={toggleSidebar}
                title="Afficher la sidebar"
                style={{
                  position: 'absolute', top: spacing.md, left: spacing.md,
                  zIndex: 10,
                  background: colors.surface3,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  color: colors.textMuted,
                  cursor: 'pointer',
                  padding: `${spacing.xs + 2}px ${spacing.sm}px`,
                  fontSize: fontSizes.md,
                  fontFamily: fonts.mono,
                  transition: transitions.fast,
                  display: 'flex', alignItems: 'center', gap: spacing.xs,
                }}
                onMouseEnter={e => e.currentTarget.style.color = colors.text}
                onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
              >
                ☰
              </button>
            )}
            <main style={{ flex: 1, overflow: 'auto' }}>
              {children}
            </main>
          </div>
        </div>
      </LayoutContext.Provider>
    </ProjectsContext.Provider>
  );
}
