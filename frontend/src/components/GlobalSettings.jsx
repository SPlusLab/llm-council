import { useState, useEffect } from 'react';
import Modal from './Modal';
import { CheckIcon, SettingsIcon } from './icons';
import './GlobalSettings.css';

// Import config defaults
const DEFAULT_COUNCIL_MODELS = [
  'openai/gpt-5.1',
  'google/gemini-3-pro-preview',
  'deepseek/deepseek-v3.2',
  'x-ai/grok-4',
];

const DEFAULT_CHAIRMAN_MODEL = 'anthropic/claude-sonnet-4.5';

const AVAILABLE_MODELS = [
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI', inputPrice: 1.25, outputPrice: 10.0 },
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google', inputPrice: 2.0, outputPrice: 12.0 },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek v3.2', provider: 'DeepSeek', inputPrice: 0.25, outputPrice: 0.38 },
  { id: 'x-ai/grok-4', name: 'Grok 4', provider: 'xAI', inputPrice: 3.0, outputPrice: 15.0 },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', inputPrice: 3.0, outputPrice: 15.0 },
];

export default function GlobalSettings({ isOpen, onClose }) {
  const [selectedCouncilModels, setSelectedCouncilModels] = useState([]);
  const [selectedChairman, setSelectedChairman] = useState('');

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('globalModelConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setSelectedCouncilModels(config.councilModels || DEFAULT_COUNCIL_MODELS);
        setSelectedChairman(config.chairmanModel || DEFAULT_CHAIRMAN_MODEL);
      } catch (e) {
        console.error('Failed to load global settings:', e);
        setSelectedCouncilModels(DEFAULT_COUNCIL_MODELS);
        setSelectedChairman(DEFAULT_CHAIRMAN_MODEL);
      }
    } else {
      setSelectedCouncilModels(DEFAULT_COUNCIL_MODELS);
      setSelectedChairman(DEFAULT_CHAIRMAN_MODEL);
    }
  }, [isOpen]);

  const handleToggleCouncilModel = (modelId) => {
    setSelectedCouncilModels((prev) => {
      if (prev.includes(modelId)) {
        // Don't allow removing if it's the last one
        if (prev.length === 1) {
          alert('You must have at least one council member selected.');
          return prev;
        }
        return prev.filter((id) => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const handleSave = () => {
    const config = {
      councilModels: selectedCouncilModels,
      chairmanModel: selectedChairman,
    };
    localStorage.setItem('globalModelConfig', JSON.stringify(config));
    onClose();
  };

  const formatPrice = (price) => `$${price.toFixed(2)}`;

  const getTotalEstimatedCost = () => {
    const councilCost = selectedCouncilModels.reduce((sum, modelId) => {
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      return sum + (model ? model.inputPrice + model.outputPrice : 0);
    }, 0);

    const chairmanModel = AVAILABLE_MODELS.find((m) => m.id === selectedChairman);
    const chairmanCost = chairmanModel ? chairmanModel.inputPrice + chairmanModel.outputPrice : 0;

    return councilCost + chairmanCost;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={20} />
          <span>Global Model Settings</span>
        </div>
      }
      footer={
        <>
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSave}>
            Save Settings
          </button>
        </>
      }
      wide
    >
      <div className="global-settings">
        <div className="settings-section">
          <h3>Council Members</h3>
          <p className="settings-description">
            Select which models will participate in Stage 1 (drafting) and Stage 2 (peer ranking).
            At least one model must be selected.
          </p>
          <div className="model-grid">
            {AVAILABLE_MODELS.filter((m) => m.id !== selectedChairman).map((model) => (
              <div
                key={model.id}
                className={`model-card ${selectedCouncilModels.includes(model.id) ? 'selected' : ''}`}
                onClick={() => handleToggleCouncilModel(model.id)}
              >
                <div className="model-card-header">
                  <div className="model-checkbox">
                    {selectedCouncilModels.includes(model.id) && <CheckIcon size={14} />}
                  </div>
                  <div>
                    <div className="model-name">{model.name}</div>
                    <div className="model-provider">{model.provider}</div>
                  </div>
                </div>
                <div className="model-pricing">
                  <div className="price-item">
                    <span>Input</span>
                    <span className="price-value">{formatPrice(model.inputPrice)}/1M</span>
                  </div>
                  <div className="price-item">
                    <span>Output</span>
                    <span className="price-value">{formatPrice(model.outputPrice)}/1M</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-section">
          <h3>Chairman Model</h3>
          <p className="settings-description">
            Select which model will synthesize the final response in Stage 3.
          </p>
          <div className="chairman-selector">
            {AVAILABLE_MODELS.map((model) => (
              <label
                key={model.id}
                className={`chairman-option ${selectedChairman === model.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="chairman"
                  value={model.id}
                  checked={selectedChairman === model.id}
                  onChange={(e) => setSelectedChairman(e.target.value)}
                />
                <div className="chairman-option-content">
                  <div>
                    <div className="model-name">{model.name}</div>
                    <div className="model-provider">{model.provider}</div>
                  </div>
                  <div className="model-pricing-inline">
                    {formatPrice(model.inputPrice)}/{formatPrice(model.outputPrice)} per 1M tokens
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-summary">
          <div className="summary-item">
            <span>Selected Council Members:</span>
            <strong>{selectedCouncilModels.length}</strong>
          </div>
          <div className="summary-item">
            <span>Total Models in Process:</span>
            <strong>{selectedCouncilModels.length + 1}</strong>
          </div>
          <div className="summary-item">
            <span>Estimated Base Cost (per 1M tokens):</span>
            <strong className="cost-highlight">${getTotalEstimatedCost().toFixed(2)}</strong>
          </div>
        </div>

        <div className="settings-note">
          <strong>Note:</strong> These settings will be used as defaults for new conversations.
          You can override model selection for individual conversations from the chat header.
        </div>
      </div>
    </Modal>
  );
}
