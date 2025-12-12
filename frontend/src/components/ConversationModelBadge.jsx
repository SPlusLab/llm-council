import { useState, useRef, useEffect } from 'react';
import { SettingsIcon, ChevronDownIcon } from './icons';
import './ConversationModelBadge.css';

export default function ConversationModelBadge({ 
  conversationId, 
  selectedModels = null,
  onModelsChange 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localCouncilModels, setLocalCouncilModels] = useState([]);
  const [localChairman, setLocalChairman] = useState('');
  const dropdownRef = useRef(null);

  // Available models
  const AVAILABLE_MODELS = [
    { id: 'openai/gpt-5.1', name: 'GPT-5.1', shortName: 'gpt-5.1' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', shortName: 'gemini-3-pr' },
    { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek v3.2', shortName: 'deepseek-v3.2' },
    { id: 'x-ai/grok-4', name: 'Grok 4', shortName: 'grok-4' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', shortName: 'claude-sonnet-4.5' },
  ];

  // Load models from selectedModels or global defaults
  useEffect(() => {
    if (selectedModels) {
      setLocalCouncilModels(selectedModels.councilModels || []);
      setLocalChairman(selectedModels.chairmanModel || '');
    } else {
      // Load from global settings
      const globalConfig = localStorage.getItem('globalModelConfig');
      if (globalConfig) {
        const config = JSON.parse(globalConfig);
        setLocalCouncilModels(config.councilModels || []);
        setLocalChairman(config.chairmanModel || '');
      }
    }
  }, [selectedModels, conversationId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleCouncilModel = (modelId) => {
    const newModels = localCouncilModels.includes(modelId)
      ? localCouncilModels.filter((id) => id !== modelId)
      : [...localCouncilModels, modelId];

    if (newModels.length === 0) {
      alert('At least one council member must be selected.');
      return;
    }

    setLocalCouncilModels(newModels);
  };

  const handleChairmanChange = (modelId) => {
    setLocalChairman(modelId);
  };

  const handleApply = () => {
    onModelsChange({
      councilModels: localCouncilModels,
      chairmanModel: localChairman,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    const globalConfig = localStorage.getItem('globalModelConfig');
    if (globalConfig) {
      const config = JSON.parse(globalConfig);
      setLocalCouncilModels(config.councilModels || []);
      setLocalChairman(config.chairmanModel || '');
      onModelsChange(null); // Reset to global defaults
    }
    setIsOpen(false);
  };

  // Format badge text with truncation
  const getBadgeText = () => {
    const councilNames = localCouncilModels
      .map((id) => {
        const model = AVAILABLE_MODELS.find((m) => m.id === id);
        return model ? model.shortName : id;
      })
      .join(' · ');

    const chairmanModel = AVAILABLE_MODELS.find((m) => m.id === localChairman);
    const chairmanName = chairmanModel ? chairmanModel.shortName : localChairman;

    const fullText = `${councilNames} → ${chairmanName}`;
    
    // Truncate if too long (>60 chars)
    if (fullText.length > 60) {
      const truncated = fullText.substring(0, 57) + '...';
      return { text: truncated, full: fullText, isTruncated: true };
    }
    
    return { text: fullText, full: fullText, isTruncated: false };
  };

  const badgeInfo = getBadgeText();
  const isUsingGlobalDefaults = !selectedModels;

  return (
    <div className="conversation-model-badge" ref={dropdownRef}>
      <button
        className="model-badge-btn"
        onClick={() => setIsOpen(!isOpen)}
        title={badgeInfo.isTruncated ? badgeInfo.full : 'Configure models for this conversation'}
        aria-label="Model configuration"
      >
        <span className="model-badge-text">{badgeInfo.text}</span>
        <ChevronDownIcon size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="model-badge-dropdown">
          <div className="dropdown-header">
            <h4>Models for this Conversation</h4>
            {!isUsingGlobalDefaults && (
              <span className="override-indicator">Custom</span>
            )}
          </div>

          <div className="dropdown-section">
            <label className="section-label">Council Members</label>
            <div className="model-checkboxes">
              {AVAILABLE_MODELS.filter((m) => m.id !== localChairman).map((model) => (
                <label key={model.id} className="model-checkbox-item">
                  <input
                    type="checkbox"
                    checked={localCouncilModels.includes(model.id)}
                    onChange={() => handleToggleCouncilModel(model.id)}
                  />
                  <span>{model.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="dropdown-section">
            <label className="section-label">Chairman</label>
            <div className="model-radios">
              {AVAILABLE_MODELS.map((model) => (
                <label key={model.id} className="model-radio-item">
                  <input
                    type="radio"
                    name="chairman"
                    checked={localChairman === model.id}
                    onChange={() => handleChairmanChange(model.id)}
                  />
                  <span>{model.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="dropdown-footer">
            <button className="secondary-button-sm" onClick={handleReset}>
              Reset to Global
            </button>
            <button className="primary-button-sm" onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
