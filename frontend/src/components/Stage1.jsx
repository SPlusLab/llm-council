import { useState } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';
import './Stage1.css';

export default function Stage1({ responses }) {
  const [activeTab, setActiveTab] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!responses || responses.length === 0) {
    return null;
  }

  return (
    <div className="stage stage1">
      <button
        className="stage-expand-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        {isExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
        <span>Show {responses.length} model drafts</span>
      </button>

      {isExpanded && (
        <div className="stage-content">
          <div className="tabs">
            {responses.map((resp, index) => (
              <button
                key={index}
                className={`tab ${activeTab === index ? 'active' : ''}`}
                onClick={() => setActiveTab(index)}
              >
                {resp.model.split('/')[1] || resp.model}
              </button>
            ))}
          </div>

          <div className="tab-content">
            <div className="model-name">{responses[activeTab].model}</div>
            <div className="response-text markdown-content">
              <MarkdownRenderer>{responses[activeTab].response}</MarkdownRenderer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
