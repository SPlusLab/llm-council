import React, { useState, useEffect } from 'react';
import api from '../api';
import { SearchIcon, FileTextIcon, ImageIcon, FileIcon, AlertCircleIcon } from './icons';
import './Library.css';

export default function Library({ onNavigateToConversation }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getLibraryFiles();
      setFiles(response.files || []);
    } catch (err) {
      console.error('Error loading library files:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getFileIcon(mimeType) {
    if (!mimeType) return <FileIcon />;
    if (mimeType.startsWith('image/')) return <ImageIcon />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileTextIcon />;
    return <FileIcon />;
  }

  function handleFileClick(file) {
    if (file.conversation_id && onNavigateToConversation) {
      onNavigateToConversation(file.conversation_id);
    }
  }

  return (
    <div className="library">
      <div className="library-header">
        <div className="library-title">
          <h1>Library</h1>
          <span className="library-count">{filteredFiles.length} files</span>
        </div>

        <div className="library-controls">
          <div className="library-search">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="library-search-input"
            />
          </div>

          <div className="library-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="2" y1="3" x2="14" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="library-loading">
          <div className="spinner"></div>
          <p>Loading files...</p>
        </div>
      )}

      {error && (
        <div className="library-error">
          <AlertCircleIcon />
          <p>{error}</p>
          <button onClick={loadFiles} className="retry-btn">Try Again</button>
        </div>
      )}

      {!loading && !error && filteredFiles.length === 0 && (
        <div className="library-empty">
          <FileTextIcon />
          <h2>No files found</h2>
          <p>
            {searchQuery
              ? 'Try a different search term'
              : 'Upload files in your conversations to see them here'}
          </p>
        </div>
      )}

      {!loading && !error && filteredFiles.length > 0 && (
        <div className={`library-files ${viewMode}`}>
          {filteredFiles.map((file, index) => (
            <div
              key={`${file.conversation_id}-${file.url}-${index}`}
              className="file-card"
              onClick={() => handleFileClick(file)}
            >
              <div className="file-icon">
                {getFileIcon(file.mime_type)}
              </div>
              <div className="file-info">
                <div className="file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="file-meta">
                  <span className="file-size">{formatFileSize(file.size)}</span>
                  <span className="file-separator">•</span>
                  <span className="file-date">{formatDate(file.uploaded_at)}</span>
                </div>
                {file.conversation_title && (
                  <div className="file-conversation" title={file.conversation_title}>
                    From: {file.conversation_title}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
