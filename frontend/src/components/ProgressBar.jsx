import './ProgressBar.css';

export default function ProgressBar({ stage, progress, tokenCount, modelsComplete, totalModels }) {
  const getStageLabel = () => {
    switch (stage) {
      case 1:
        return `Stage 1: Drafting... (${modelsComplete}/${totalModels} models)`;
      case 2:
        return 'Stage 2: Peer ranking...';
      case 3:
        return 'Stage 3: Chairman synthesis...';
      default:
        return 'Processing...';
    }
  };

  const getStageStatus = () => {
    switch (stage) {
      case 1:
        return tokenCount ? `${tokenCount.toLocaleString()} tokens` : '';
      case 2:
        return tokenCount ? `${tokenCount.toLocaleString()} tokens` : '';
      case 3:
        return tokenCount ? `${tokenCount.toLocaleString()} tokens` : '';
      default:
        return '';
    }
  };

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-content">
        <div className="progress-info">
          <span className="progress-label">{getStageLabel()}</span>
          {tokenCount > 0 && (
            <span className="progress-tokens">{getStageStatus()}</span>
          )}
        </div>
        <div className="progress-track">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-percentage">{Math.round(progress)}%</div>
      </div>
    </div>
  );
}
