import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { SearchIcon, FileTextIcon, ClockIcon } from './icons';
import './QuickSwitcher.css';

export default function QuickSwitcher({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Filter conversations based on search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv =>
        (conv.title || 'New Conversation').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations.slice(0, 10); // Show recent 10 if no search

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Update selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        Math.min(prev + 1, filteredConversations.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredConversations[selectedIndex]) {
        handleSelect(filteredConversations[selectedIndex].id);
      } else if (searchQuery.trim()) {
        // Create new conversation with search query as initial message
        onNewConversation();
        onClose();
      }
    }
  };

  const handleSelect = (convId) => {
    onSelectConversation(convId);
    onClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" hideHeader>
      <div className="quick-switcher">
        <div className="quick-switcher-search">
          <SearchIcon size={20} />
          <input
            ref={inputRef}
            type="text"
            className="quick-switcher-input"
            placeholder="Search conversations or type to create new..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="keyboard-hint">Ctrl+K</kbd>
        </div>

        <div className="quick-switcher-results">
          {filteredConversations.length === 0 ? (
            <div className="quick-switcher-empty">
              {searchQuery ? (
                <>
                  <p>No conversations found</p>
                  <button
                    className="quick-switcher-action"
                    onClick={() => {
                      onNewConversation();
                      onClose();
                    }}
                  >
                    Create new conversation
                  </button>
                </>
              ) : (
                <p>No recent conversations</p>
              )}
            </div>
          ) : (
            <>
              {!searchQuery && (
                <div className="quick-switcher-section-title">Recent Conversations</div>
              )}
              {filteredConversations.map((conv, index) => (
                <button
                  key={conv.id}
                  className={`quick-switcher-item ${
                    index === selectedIndex ? 'selected' : ''
                  } ${conv.id === currentConversationId ? 'current' : ''}`}
                  onClick={() => handleSelect(conv.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <FileTextIcon size={18} />
                  <div className="quick-switcher-item-content">
                    <div className="quick-switcher-item-title">
                      {conv.title || 'New Conversation'}
                    </div>
                    <div className="quick-switcher-item-meta">
                      <ClockIcon size={12} />
                      {formatDate(conv.created_at)}
                      {conv.message_count > 0 && (
                        <span>· {conv.message_count} messages</span>
                      )}
                    </div>
                  </div>
                  {conv.id === currentConversationId && (
                    <span className="current-badge">Current</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="quick-switcher-footer">
          <div className="quick-switcher-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
