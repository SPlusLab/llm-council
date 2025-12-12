import { useState } from 'react';
import { FolderIcon, EditIcon, TrashIcon, PlusIcon, XIcon } from './icons';
import './Projects.css';

export default function Projects({ 
  projects, 
  onCreateProject, 
  onUpdateProject, 
  onDeleteProject,
  onProjectClick 
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#10b981');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const PRESET_COLORS = [
    '#10b981', // green
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim(), newProjectColor);
      setNewProjectName('');
      setNewProjectColor('#10b981');
      setIsCreating(false);
    }
  };

  const handleUpdateProject = (projectId) => {
    if (editName.trim()) {
      onUpdateProject(projectId, { name: editName.trim(), color: editColor });
      setEditingId(null);
      setEditName('');
      setEditColor('');
    }
  };

  const startEdit = (project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditColor(project.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h2>Projects</h2>
        <button
          className="projects-create-btn"
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          <PlusIcon size={16} />
          New Project
        </button>
      </div>

      {isCreating && (
        <div className="project-form">
          <input
            type="text"
            className="project-name-input"
            placeholder="Project name..."
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateProject();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            autoFocus
          />
          <div className="color-picker">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`color-option ${newProjectColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setNewProjectColor(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
          <div className="project-form-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setIsCreating(false);
                setNewProjectName('');
                setNewProjectColor('#10b981');
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="projects-list">
        {projects.length === 0 ? (
          <div className="projects-empty">
            <FolderIcon size={32} />
            <p>No projects yet</p>
            <p className="projects-empty-hint">Create a project to organize your conversations</p>
          </div>
        ) : (
          projects.map((project) => (
            <div 
              key={project.id} 
              className={`project-item ${dragOverId === project.id ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverId(project.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) {
                  setDragOverId(null);
                }
              }}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverId(null);
                const conversationId = e.dataTransfer.getData('conversationId');
                if (conversationId && onAssignToProject) {
                  await onAssignToProject(conversationId, project.id);
                }
              }}
            >
              {editingId === project.id ? (
                <div className="project-form">
                  <input
                    type="text"
                    className="project-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateProject(project.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="color-picker">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`color-option ${editColor === color ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditColor(color)}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                  <div className="project-form-actions">
                    <button className="btn-secondary" onClick={cancelEdit}>
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => handleUpdateProject(project.id)}
                      disabled={!editName.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="project-item-content"
                    onClick={() => onProjectClick && onProjectClick(project.id)}
                  >
                    <div
                      className="project-color"
                      style={{ backgroundColor: project.color }}
                    />
                    <FolderIcon size={18} />
                    <span className="project-name">{project.name}</span>
                  </div>
                  <div className="project-item-actions">
                    <button
                      className="project-action-btn"
                      onClick={() => startEdit(project)}
                      aria-label="Edit project"
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      className="project-action-btn danger"
                      onClick={() => onDeleteProject(project.id)}
                      aria-label="Delete project"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
