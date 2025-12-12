import { SettingsIcon } from './icons';
import './WorkModeCard.css';

export default function WorkModeCard({
  mode,
  icon: Icon,
  title,
  description,
  active = false,
  disabled = false,
  badge = null,
  onSelect,
  onConfigure,
}) {
  const handleCardClick = () => {
    if (!disabled && onSelect) {
      onSelect(mode);
    }
  };

  const handleConfigureClick = (e) => {
    e.stopPropagation();
    if (!disabled && onConfigure) {
      onConfigure(mode);
    }
  };

  return (
    <button
      className={`work-mode-card ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleCardClick}
      disabled={disabled}
      aria-label={`${title} work mode`}
      aria-pressed={active}
    >
      <div className="work-mode-card-header">
        <div className="work-mode-card-icon">
          {Icon && <Icon size={24} />}
        </div>
        {!disabled && onConfigure && (
          <button
            className="work-mode-card-settings"
            onClick={handleConfigureClick}
            aria-label={`Configure ${title}`}
            title={`Configure ${title}`}
            disabled={disabled}
          >
            <SettingsIcon size={16} />
          </button>
        )}
      </div>
      
      <div className="work-mode-card-content">
        <h3 className="work-mode-card-title">{title}</h3>
        {description && (
          <p className="work-mode-card-description">{description}</p>
        )}
        {badge && (
          <span className="work-mode-card-badge">{badge}</span>
        )}
      </div>
    </button>
  );
}
