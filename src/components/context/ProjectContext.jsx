import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Fetch all projects
        const allProjects = await base44.entities.Project.list();
        
        // Filter projects based on user assignment (unless admin)
        let availableProjects = [];
        if (currentUser.role === 'admin' || currentUser.inspection_role === 'admin') {
          availableProjects = allProjects;
        } else {
          const assignedIds = currentUser.project_ids || [];
          availableProjects = allProjects.filter(p => assignedIds.includes(p.id));
        }
        
        setProjects(availableProjects);

        // Restore selection or set default
        const savedId = localStorage.getItem('selectedProjectId');
        if (savedId && availableProjects.find(p => p.id === savedId)) {
          setSelectedProjectId(savedId);
        } else if (availableProjects.length > 0) {
          const firstId = availableProjects[0].id;
          setSelectedProjectId(firstId);
          localStorage.setItem('selectedProjectId', firstId);
        }
      } catch (error) {
        console.error("Failed to init project context:", error);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('selectedProjectId', projectId);
    // Force a reload to ensure all queries refetch with new project context
    // Or we can just rely on the context update if components are listening
    // For now, just state update is fine, components should react
  };

  return (
    <ProjectContext.Provider value={{ 
      selectedProjectId, 
      setSelectedProjectId: handleProjectChange, 
      projects, 
      loading,
      currentProject: projects.find(p => p.id === selectedProjectId)
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);