import React, { useState } from 'react';
import './TabPanel.css';

/**
 * TabPanel - A reusable tab navigation component
 * @param {Array} tabs - Array of tab objects with { id, label, content }
 * @param {String} activeTabId - ID of the initially active tab
 */
function TabPanel({ tabs, activeTabId }) {
  const [activeTab, setActiveTab] = useState(activeTabId || tabs[0]?.id);

  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className="tab-panel">
      <div className="tab-header">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {activeContent}
      </div>
    </div>
  );
}

export default TabPanel;
