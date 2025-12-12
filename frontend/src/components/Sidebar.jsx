import { useState } from 'react';
import Modal from './Modal';
import Toast from './Toast';
import QuickSwitcher from './QuickSwitcher';
import { 
  EditIcon, 
  TrashIcon, 
  ChevronRightIcon, 
  ChevronDownIcon, 
  SearchIcon, 
  LibraryIcon, 
  FolderIcon, 
  PencilIcon,
  MenuIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  FileTextIcon
} from './icons';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  onToggleSidebar,
  theme,
  toggleTheme,
  isDark,
  searchModalOpen,
  onSearchModalClose,
  currentView,
  onViewChange,
}) {
  const [renameModal, setRenameModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);

  // Filter conversations by search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv =>
        (conv.title || 'New Conversation').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  // Group conversations by date
  const groupConversationsByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groups = {
      today: [],
      yesterday: [],
      previous7Days: [],
      previous30Days: [],
      older: [],
    };

    filteredConversations.forEach((conv) => {
      const convDate = new Date(conv.created_at);
      const convDateOnly = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

      if (convDateOnly.getTime() === today.getTime()) {
        groups.today.push(conv);
      } else if (convDateOnly.getTime() === yesterday.getTime()) {
        groups.yesterday.push(conv);
      } else if (convDateOnly >= sevenDaysAgo) {
        groups.previous7Days.push(conv);
      } else if (convDateOnly >= thirtyDaysAgo) {
        groups.previous30Days.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const conversationGroups = groupConversationsByDate();

  const handleRenameClick = (conv, e) => {
    e.stopPropagation();
    setRenameModal(conv);
    setRenameInput(conv.title || '');
    setMenuOpen(null);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameInput.trim();
    if (!trimmed) {
      setToast({ message: 'Title cannot be empty', type: 'error' });
      return;
    }
    if (trimmed.length > 100) {
      setToast({ message: 'Title must be 100 characters or less', type: 'error' });
      return;
    }
    onRenameConversation?.(renameModal.id, trimmed);
    setToast({ message: 'Conversation renamed', type: 'success' });
    setRenameModal(null);
  };

  const handleDeleteClick = (conv, e) => {
    e.stopPropagation();
    setDeleteModal(conv);
    setMenuOpen(null);
  };

  const handleDeleteConfirm = () => {
    onDeleteConversation?.(deleteModal.id);
    setToast({ message: 'Conversation deleted', type: 'success' });
    setDeleteModal(null);
  };

  const toggleMenu = (convId, e) => {
    e.stopPropagation();
    setMenuOpen(menuOpen === convId ? null : convId);
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-section">
            <button 
              className="mobile-close-btn"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <MenuIcon size={20} />
            </button>
            <img 
              src="/splus_logo.png" 
              alt="S+ Lab" 
              className="sidebar-logo" 
            />
          </div>
          <button className="sidebar-item new-chat-btn" onClick={onNewConversation}>
            <PencilIcon size={18} />
            <span>New chat</span>
          </button>
        </div>

        <div className="sidebar-body">
          {/* Search Chats */}
          <button 
            className="sidebar-item" 
            onClick={() => searchModalOpen !== undefined ? onSearchModalClose() : setSearchOpen(!searchOpen)}
          >
            <SearchIcon size={18} />
            <span>Search chats</span>
          </button>

          {/* Search Input (collapsible) - only show if searchModalOpen is not managed externally */}
          {searchModalOpen === undefined && searchOpen && (
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button 
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Library */}
          <button 
            className={`sidebar-item ${currentView === 'library' ? 'active' : ''}`}
            onClick={() => onViewChange('library')}
          >
            <LibraryIcon size={18} />
            <span>Library</span>
          </button>

          {/* Projects */}
          <button 
            className={`sidebar-item ${currentView === 'projects' ? 'active' : ''}`}
            onClick={() => onViewChange('projects')}
          >
            <FolderIcon size={18} />
            <span>Projects</span>
          </button>

          {/* Projects Section */}
          <div className="sidebar-section">
            <button 
              className="sidebar-section-header"
              onClick={() => setProjectsExpanded(!projectsExpanded)}
            >
              {projectsExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
              <span>Projects</span>
            </button>
            
            {projectsExpanded && (
              <div className="sidebar-section-content">
                <button className="sidebar-item sidebar-subitem">
                  <FolderIcon size={16} />
                  <span>New project</span>
                </button>
              </div>
            )}
          </div>

          {/* Your Chats Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Your chats</span>
            </div>
          </div>

          {/* Conversation List */}
          <div className="conversation-list">
            {filteredConversations.length === 0 ? (
              <div className="no-conversations">
                {searchQuery ? 'No matches found' : 'No conversations yet'}
              </div>
            ) : (
              <>
                {conversationGroups.today.length > 0 && (
                  <div className="conversation-list-group">
                    <div className="conversation-list-group-title">Today</div>
                    {conversationGroups.today.map((conv) => renderConversationItem(conv))}
                  </div>
                )}
                {conversationGroups.yesterday.length > 0 && (
                  <div className="conversation-list-group">
                    <div className="conversation-list-group-title">Yesterday</div>
                    {conversationGroups.yesterday.map((conv) => renderConversationItem(conv))}
                  </div>
                )}
                {conversationGroups.previous7Days.length > 0 && (
                  <div className="conversation-list-group">
                    <div className="conversation-list-group-title">Previous 7 Days</div>
                    {conversationGroups.previous7Days.map((conv) => renderConversationItem(conv))}
                  </div>
                )}
                {conversationGroups.previous30Days.length > 0 && (
                  <div className="conversation-list-group">
                    <div className="conversation-list-group-title">Previous 30 Days</div>
                    {conversationGroups.previous30Days.map((conv) => renderConversationItem(conv))}
                  </div>
                )}
                {conversationGroups.older.length > 0 && (
                  <div className="conversation-list-group">
                    <div className="conversation-list-group-title">Older</div>
                    {conversationGroups.older.map((conv) => renderConversationItem(conv))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button 
            className="sidebar-footer-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            <span>{isDark ? 'Dark' : 'Light'} mode</span>
          </button>
        </div>

        <Modal
          isOpen={!!renameModal}
          onClose={() => setRenameModal(null)}
          title="Rename Conversation"
          footer={
            <>
              <button className="secondary-button" onClick={() => setRenameModal(null)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleRenameSubmit}>
                Save
              </button>
            </>
          }
        >
          <div className="modal-form-group">
            <label htmlFor="rename-input">Conversation Title</label>
            <input
              id="rename-input"
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
              placeholder="Enter a title..."
              maxLength={100}
              autoFocus
            />
            <div className="input-helper">
              {renameInput.length}/100 characters
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Delete Conversation"
          footer={
            <>
              <button className="secondary-button" onClick={() => setDeleteModal(null)}>
                Cancel
              </button>
              <button className="danger-button" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </>
          }
        >
          <div className="modal-warning">
            <p>Are you sure you want to delete "{deleteModal?.title || 'this conversation'}"?</p>
            <p className="warning-text">
              This action cannot be undone. All messages and attachments will be permanently deleted.
            </p>
          </div>
        </Modal>
      </div>
      
      {/* QuickSwitcher Modal */}
      {searchModalOpen !== undefined && (
        <QuickSwitcher
          isOpen={searchModalOpen}
          onClose={onSearchModalClose}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={onSelectConversation}
          onNewConversation={onNewConversation}
        />
      )}
    </>
  );

  function renderConversationItem(conv) {
    return (
      <div
        key={conv.id}
        className={`conversation-item ${
          conv.id === currentConversationId ? 'active' : ''
        }`}
        onClick={() => onSelectConversation(conv.id)}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('conversationId', conv.id);
          e.currentTarget.style.opacity = '0.5';
        }}
        onDragEnd={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        <div className="conversation-item-content">
          <div className="conversation-title">
            {conv.title || 'New Conversation'}
          </div>
        </div>
        <button
          className="conversation-menu-btn"
          onClick={(e) => toggleMenu(conv.id, e)}
          aria-label="Conversation menu"
        >
          ⋮
        </button>
        {menuOpen === conv.id && (
          <div className="conversation-menu">
            <button onClick={(e) => handleRenameClick(conv, e)}>
              <EditIcon size={14} /> Rename
            </button>
            <button onClick={(e) => handleDeleteClick(conv, e)} className="danger">
              <TrashIcon size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    );
  }

}
