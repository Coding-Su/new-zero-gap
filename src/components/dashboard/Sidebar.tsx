// src/components/dashboard/Sidebar.tsx
import { Plus, FolderKanban, ChevronRight, Trash2 } from 'lucide-react';
import type { Project } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onDeleteProject: (id: string) => void;
}

const Sidebar = ({ 
  isOpen,
  projects, 
  selectedProjectId, 
  onSelectProject,
  onAddProject,
  onDeleteProject 
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
                <div className="project-info-group">
                  <FolderKanban size={18} className="project-icon" />
                  <span className="project-name">{project.name}</span>
                </div>

                <div className="project-action-group">
                  {/* ⭐ 3. 삭제 버튼 추가 */}
                  <button 
                    className="project-del-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // ❗ 클릭 이벤트 전파 차단 (프로젝트 선택 방지)
                      onDeleteProject(project.id);
                    }}
                    title="프로젝트 삭제"
                  >
                    <Trash2 size={14} />
                  </button>  
                  <ChevronRight size={14} className="arrow-icon" />
                </div>  
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