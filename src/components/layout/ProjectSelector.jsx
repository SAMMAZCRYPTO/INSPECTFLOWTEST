import React from 'react';
import { useProject } from '../context/ProjectContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderKanban } from "lucide-react";

export default function ProjectSelector({ mobile = false }) {
  const { projects, selectedProjectId, setSelectedProjectId, loading } = useProject();

  if (loading) return <div className="w-32 h-9 bg-gray-100 animate-pulse rounded-md" />;
  
  // If no projects are available, maybe show nothing or a placeholder
  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-md border">
        <FolderKanban className="w-4 h-4" />
        <span>No Projects</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${mobile ? 'w-full' : 'min-w-[200px]'}`}>
      <FolderKanban className={`w-4 h-4 text-gray-500 ${mobile ? 'hidden' : ''}`} />
      <Select value={selectedProjectId || ""} onValueChange={setSelectedProjectId}>
        <SelectTrigger className={`${mobile ? 'w-full' : 'w-[240px]'} h-9 bg-white border-gray-300 focus:ring-indigo-500`}>
          <SelectValue placeholder="Select Project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}