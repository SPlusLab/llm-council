import { useState } from 'react';
import { CopyIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';
import Toast from './Toast';
import './Stage3.css';

export default function Stage3({ finalResponse }) {
  const [toast, setToast] = useState(null);

  if (!finalResponse) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalResponse.response || '');
      setToast({ message: 'Response copied to clipboard', type: 'success' });
    } catch (e) {
      console.error('Failed to copy text:', e);
      setToast({ message: 'Failed to copy. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="stage stage3">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="stage3-header">
        <h3 className="stage-title">Final Council Answer</h3>
        <div className="chairman-label">
          Chairman: {finalResponse.model.split('/')[1] || finalResponse.model}
        </div>
        <button className="copy-button" onClick={handleCopy}>
          <CopyIcon size={16} />
          Copy
        </button>
      </div>
      <div className="final-text markdown-content">
        <MarkdownRenderer>{finalResponse.response}</MarkdownRenderer>
      </div>
    </div>
  );
}
