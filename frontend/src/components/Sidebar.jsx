import { useState, useEffect } from 'react';
import './Sidebar.css';

import TrashIcon from './TrashIcon';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <img src="/logo.png" alt="S+ Lab Logo" className="logo" />
          <h1>S+ Lab LLM Council</h1>
        </div>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
            >
              <div
                className="conversation-main"
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="conversation-title">
                  {conv.title || 'New Conversation'}
                </div>
                <div className="conversation-meta">
                  {conv.message_count} messages
                </div>
              </div>
              <button
                className="delete-conversation-btn"
                title="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation && onDeleteConversation(conv.id);
                }}
              >
                <TrashIcon size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
