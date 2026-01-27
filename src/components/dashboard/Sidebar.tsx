// src/components/dashboard/Sidebar.tsx
import { Plus, FolderKanban, ChevronRight } from 'lucide-react';
import type { Project } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
}

const Sidebar = ({ 
  isOpen,
  projects, 
  selectedProjectId, 
  onSelectProject,
  onAddProject 
}: SidebarProps) => {
  return (
    <aside className={`zg-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          ZERO-GAP<span className="dot">.</span>
        </div>
        <button className="add-project-btn" onClick={onAddProject} title="새 프로젝트 추가">
          <Plus size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-label">MY PROJECTS</p>
        <div className="project-list">
          {projects.length === 0 ? (
            <p className="empty-projects">프로젝트를 생성해주세요.</p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`project-item ${selectedProjectId === project.id ? 'active' : ''}`}
                onClick={() => onSelectProject(project.id)}
              >
                <FolderKanban size={18} className="project-icon" />
                <span className="project-name">{project.name}</span>
                <ChevronRight size={14} className="arrow-icon" />
              </div>
            ))
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <p className="footer-text">v2.0 Project Mode</p>
      </div>
    </aside>
  );
};

export default Sidebar;