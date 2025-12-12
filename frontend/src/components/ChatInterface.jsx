import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import { SendIcon, AttachIcon, SettingsIcon, ArrowDownIcon, MenuIcon, FileTextIcon, SunIcon, MoonIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';
import CaseStudySettings from './CaseStudySettings';
import MeetingMinutesSettings from './MeetingMinutesSettings';
import WorkModeCard from './WorkModeCard';
import Modal from './Modal';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import Toast from './Toast';
import { useTheme } from '../context/ThemeContext';
import './ChatInterface.css';

const defaultSections = ['Context', 'Challenge', 'Actions', 'Results', 'Lessons'];
const defaultOutputExtras = ['title_options', 'pull_quotes', 'tldr'];
const defaultStyleCard =
  'Clear, confident narrative voice. Crisp verbs, short paragraphs, vivid but unfussy detail. First-person plural when appropriate, light jargon, each section ends with a takeaway. No hype; mix short and long sentences for rhythm.';
const defaultCaseSettings = {
  caseContext: '',
  keyFacts: '',
  styleCard: defaultStyleCard,
  exemplarSnippets: '',
  lengthTarget: '600-800 words',
  sensitivities: 'Anonymize sensitive names unless explicitly allowed. Avoid legal/medical claims.',
  mode: 'draft',
  sections: defaultSections,
  outputExtras: defaultOutputExtras,
  existingDraft: '',
};
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const mergeWithDefault = (value, fallback) =>
  value === undefined || value === null ? fallback : value;

export default function ChatInterface({
  conversation,
  onSendMessage,
  onCancel,
  isLoading,
  streamError,
  workMode,
  onWorkModeChange,
  onToggleSidebar,
  onOpenGlobalSettings,
}) {
  const { toggleTheme, isDark } = useTheme();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [toast, setToast] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [caseContext, setCaseContext] = useState(defaultCaseSettings.caseContext);
  const [keyFacts, setKeyFacts] = useState(defaultCaseSettings.keyFacts);
  const [styleCard, setStyleCard] = useState(defaultCaseSettings.styleCard);
  const [exemplarSnippets, setExemplarSnippets] = useState(defaultCaseSettings.exemplarSnippets);
  const [lengthTarget, setLengthTarget] = useState(defaultCaseSettings.lengthTarget);
  const [sensitivities, setSensitivities] = useState(defaultCaseSettings.sensitivities);
  const [mode, setMode] = useState(defaultCaseSettings.mode);
  const [sections, setSections] = useState(defaultCaseSettings.sections);
  const [outputExtras, setOutputExtras] = useState(defaultCaseSettings.outputExtras);
  const [existingDraft, setExistingDraft] = useState(defaultCaseSettings.existingDraft);
  const [costEstimate, setCostEstimate] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [meetingMinutesSettingsOpen, setMeetingMinutesSettingsOpen] = useState(false);
  const [costBadgeDismissed, setCostBadgeDismissed] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const applyCaseSettings = useCallback((settings = {}) => {
    const merged = {
      caseContext: mergeWithDefault(settings.caseContext, defaultCaseSettings.caseContext),
      keyFacts: mergeWithDefault(settings.keyFacts, defaultCaseSettings.keyFacts),
      styleCard: mergeWithDefault(settings.styleCard, defaultCaseSettings.styleCard),
      exemplarSnippets: mergeWithDefault(
        settings.exemplarSnippets,
        defaultCaseSettings.exemplarSnippets
      ),
      lengthTarget: mergeWithDefault(settings.lengthTarget, defaultCaseSettings.lengthTarget),
      sensitivities: mergeWithDefault(settings.sensitivities, defaultCaseSettings.sensitivities),
      mode: mergeWithDefault(settings.mode, defaultCaseSettings.mode),
      sections: mergeWithDefault(settings.sections, defaultCaseSettings.sections),
      outputExtras: mergeWithDefault(settings.outputExtras, defaultCaseSettings.outputExtras),
      existingDraft: mergeWithDefault(settings.existingDraft, defaultCaseSettings.existingDraft),
    };

    setCaseContext(merged.caseContext);
    setKeyFacts(merged.keyFacts);
    setStyleCard(merged.styleCard);
    setExemplarSnippets(merged.exemplarSnippets);
    setLengthTarget(merged.lengthTarget);
    setSensitivities(merged.sensitivities);
    setMode(merged.mode);
    setSections([...merged.sections]);
    setOutputExtras([...merged.outputExtras]);
    setExistingDraft(merged.existingDraft);
  }, []);

  const validateFiles = (files) => {
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        setToast({ message: error, type: 'error' });
        return false;
      }
    }
    return true;
  };

  const uploadFiles = async (files, { resetDrag } = {}) => {
    if (!files.length) return;

    setIsUploading(true);
    setUploadProgress(files.map((file) => ({ name: file.name, progress: 0 })));

    try {
      const uploads = await Promise.all(
        files.map(async (file, index) => {
          try {
            setUploadProgress((prev) =>
              prev.map((item, i) => (i === index ? { ...item, progress: 50 } : item))
            );
            const result = await api.uploadFile(file);
            setUploadProgress((prev) =>
              prev.map((item, i) => (i === index ? { ...item, progress: 100 } : item))
            );
            return result;
          } catch (err) {
            setUploadProgress((prev) =>
              prev.map((item, i) => (i === index ? { ...item, error: true } : item))
            );
            throw err;
          }
        })
      );
      setAttachments((prev) => [...prev, ...uploads]);
      setToast({ message: `${uploads.length} file(s) uploaded successfully`, type: 'success' });
    } catch (error) {
      console.error('Failed to upload file:', error);
      setToast({
        message: 'Failed to upload one or more files. Please try again.',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress([]);
      if (resetDrag) {
        setIsDragging(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e) => {
    const container = e.target;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const autoGrowTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 200; // Max 200px
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    autoGrowTextarea();
  }, [input]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    triggerEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, attachments]);

  // Load settings from the last message in the conversation (if any)
  useEffect(() => {
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      applyCaseSettings();
      return;
    }

    // Find the last user message with case_settings
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const msg = conversation.messages[i];
      if (msg.role === 'user' && msg.case_settings) {
        applyCaseSettings({
          caseContext: msg.case_settings.case_context,
          keyFacts: msg.case_settings.key_facts,
          styleCard: msg.case_settings.style_card,
          exemplarSnippets: msg.case_settings.exemplar_snippets,
          lengthTarget: msg.case_settings.length,
          sensitivities: msg.case_settings.sensitivities,
          mode: msg.case_settings.mode,
          sections: msg.case_settings.sections,
          outputExtras: msg.case_settings.output_extras,
          existingDraft: msg.case_settings.existing_text,
        });
        return;
      }
    }
  }, [conversation, applyCaseSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!conversation) {
      return;
    }
    if (input.trim() && !isLoading) {
      await onSendMessage({
        content: input,
        attachments,
        case_settings: buildCaseSettings(),
      });
      setInput('');
      setAttachments([]);
      setCostEstimate(null);
      setCostBadgeDismissed(false);
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const toggleSection = (name) => {
    setSections((prev) => {
      if (prev.includes(name)) {
        return prev.filter((s) => s !== name);
      }
      const next = [...prev, name];
      return defaultSections.filter((sec) => next.includes(sec));
    });
  };

  const toggleExtra = (name) => {
    setOutputExtras((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const attachmentCharsEstimate = (att) => {
    if (!att?.size) return 0;
    const size = att.size;
    const mime = (att.mime_type || '').toLowerCase();
    // Heuristics: text-like ~1 char/byte, PDFs ~0.4 char/byte (compression), images negligible for text.
    if (mime.includes('text') || mime.includes('json') || mime.includes('markdown')) {
      return size;
    }
    if (mime.includes('pdf')) {
      return Math.floor(size * 0.4);
    }
    if (mime.includes('word') || mime.includes('document')) {
      return Math.floor(size * 0.8);
    }
    // Default minimal impact
    return Math.floor(size * 0.05);
  };

  const totalAttachmentChars = () =>
    attachments.reduce((sum, att) => sum + attachmentCharsEstimate(att), 0);

  const triggerEstimate = async () => {
    const messageLengthChars = input.length;
    const attachment_length_chars = totalAttachmentChars();
    if (messageLengthChars === 0 && attachment_length_chars === 0) {
      setCostEstimate(null);
      return;
    }
    setIsEstimating(true);
    setEstimateError(null);
    try {
      const data = await api.estimateCost({
        message_length_chars: messageLengthChars,
        attachment_length_chars,
      });
      setCostEstimate(data);
    } catch (err) {
      console.error('Failed to estimate cost', err);
      setEstimateError('Could not estimate cost');
      setCostEstimate(null);
    } finally {
      setIsEstimating(false);
    }
  };

  const buildCaseSettings = () => ({
    case_context: caseContext.trim() || undefined,
    key_facts: keyFacts.trim() || undefined,
    style_card: styleCard.trim() || undefined,
    exemplar_snippets: exemplarSnippets.trim() || undefined,
    length: lengthTarget.trim() || undefined,
    sections,
    sensitivities: sensitivities.trim() || undefined,
    mode,
    output_extras: outputExtras,
    existing_text: mode === 'draft' ? undefined : (existingDraft.trim() || undefined),
  });

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" is too large. Maximum size is 10MB.`;
    }
    return null;
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (isUploading) {
      setToast({ message: 'Please wait for current upload to complete', type: 'info' });
      e.target.value = '';
      return;
    }
    if (!validateFiles(files)) {
      e.target.value = '';
      return;
    }

    await uploadFiles(files);
    e.target.value = '';
  };

  const handleRemoveAttachment = (url) => {
    setAttachments((prev) => prev.filter((att) => att.url !== url));
    setToast({ message: 'Attachment removed', type: 'info' });
  };

  const handleAttachClick = () => {
    if (isUploading) {
      setToast({ message: 'Please wait for current upload to complete', type: 'info' });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the container itself
    if (e.target.className.includes('messages-container')) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!conversation) {
      setIsDragging(false);
      return;
    }
    if (isUploading) {
      setToast({ message: 'Please wait for current upload to complete', type: 'info' });
      setIsDragging(false);
      return;
    }
    
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) {
      setIsDragging(false);
      return;
    }
    if (!validateFiles(files)) {
      setIsDragging(false);
      return;
    }

    await uploadFiles(files, { resetDrag: true });
  };

  const renderCostBadge = () => {
    if (!costEstimate || costBadgeDismissed) return null;
    
    const formatMoney = (val) => `$${(val || 0).toFixed(4)}`;

    return (
      <div className="cost-badge">
        <span className="cost-badge-value">{formatMoney(costEstimate.cost_total)}</span>
        <span className="cost-badge-meta">~{costEstimate.base_tokens || 0} tokens</span>
        <button
          type="button"
          className="cost-badge-dismiss"
          onClick={() => setCostBadgeDismissed(true)}
          aria-label="Dismiss cost estimate"
        >
          ×
        </button>
      </div>
    );
  };

  const handleSettingsChange = (newSettings) => {
    applyCaseSettings(newSettings);
  };

  const handleWorkModeSelect = async (mode) => {
    if (!conversation) return;
    try {
      await api.updateConversation(conversation.id, { work_mode: mode });
      if (onWorkModeChange) {
        onWorkModeChange(mode);
      }
    } catch (error) {
      console.error('Failed to update work mode:', error);
      setToast({ message: 'Failed to update work mode', type: 'error' });
    }
  };

  const handleWorkModeConfigure = (mode) => {
    if (mode === 'case-study') {
      setSettingsExpanded(true);
    } else if (mode === 'meeting-minutes') {
      setMeetingMinutesSettingsOpen(true);
    }
  };

  return (
    <div 
      className="chat-interface"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-content">
            <div className="drag-drop-icon">📎</div>
            <p className="drag-drop-text">Drop files here to attach</p>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Right Header */}
      <div className="chat-header">
        <div className="chat-header-actions">
          <button
            className="header-icon-btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>
          <button
            className="header-icon-btn"
            onClick={onOpenGlobalSettings}
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>

      {conversation && conversation.messages && conversation.messages.length > 0 && (
        <div className="work-mode-selector-wrapper">
          <div className="work-mode-selector">
            {!conversation.work_mode && (
              <p className="work-mode-prompt">Select a work mode to begin</p>
            )}
            <div className="work-mode-cards-horizontal">
              <WorkModeCard
                mode="case-study"
                icon={FileTextIcon}
                title="Case Study"
                active={conversation.work_mode === 'case-study'}
                onSelect={handleWorkModeSelect}
                onConfigure={handleWorkModeConfigure}
              />
              <WorkModeCard
                mode="meeting-minutes"
                icon={FileTextIcon}
                title="Meeting Minutes"
                active={conversation.work_mode === 'meeting-minutes'}
                disabled={true}
                badge="Soon"
                onSelect={handleWorkModeSelect}
                onConfigure={handleWorkModeConfigure}
              />
            </div>
          </div>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="messages-container"
        onScroll={handleScroll}
      >
        <button
          className="mobile-hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <MenuIcon size={20} />
        </button>

        {(!conversation || !conversation.messages || conversation.messages.length === 0) && (
          <div className="empty-state">
            <div className="empty-state-content-wrapper">
              <div className="empty-state-hero">
                <div className="empty-state-logo-text">S+</div>
                <h2>Meet LLM Council</h2>
                <p className="empty-state-subtitle">
                  Center your insights with a guided work mode. Case studies crafted in minutes, no guesswork.
                </p>
                <div className="empty-state-card-grid">
                  <button
                    className={`empty-state-card ${workMode === 'case-study' ? 'active' : ''}`}
                    onClick={() => onWorkModeChange && onWorkModeChange('case-study')}
                  >
                    <div className="empty-state-card-icon">
                      <FileTextIcon size={20} />
                    </div>
                    <div>
                      <h3>Case Study</h3>
                      <p>Craft structured impact stories with thoughtful prompts.</p>
                    </div>
                  </button>
                  <button className="empty-state-card disabled" disabled>
                    <div className="empty-state-card-icon">
                      <FileTextIcon size={20} />
                    </div>
                    <div>
                      <h3>Meeting Minutes</h3>
                      <p>Summaries and action items tailored to your team.</p>
                      <span className="empty-state-badge">Soon</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {conversation && conversation.messages.length > 0 && (
          <div className="messages-content-wrapper">
            <div className="messages-content">
              {conversation.messages.map((msg, index) => (
                <div key={index} className="message-group">
                  {msg.role === 'user' ? (
                    <div className="user-message">
                      <div className="message-label">You</div>
                      <div className="message-content">
                        <div className="markdown-content">
                          <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                        </div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="attachment-list">
                            {msg.attachments.map((att) => (
                              <div key={att.url} className="attachment-item">
                                <span className="attachment-icon">{getFileIcon(att.mime_type)}</span>
                                <div className="attachment-info">
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="attachment-link"
                                  >
                                    {att.name}
                                  </a>
                                  {att.size && (
                                    <span className="attachment-size">{formatFileSize(att.size)}</span>
                                  )}
                                </div>
                                {att.mime_type?.startsWith('image/') && (
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="attachment-thumbnail"
                                    loading="lazy"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="assistant-message">
                      <div className="message-label">LLM Council</div>

                      {msg.loading?.stage1 && (
                        <div className="stage-loading">
                          <div className="spinner"></div>
                          <span>Running Stage 1: Collecting individual responses...</span>
                        </div>
                      )}
                      {msg.stage1 && <Stage1 responses={msg.stage1} />}

                      {msg.loading?.stage2 && (
                        <div className="stage-loading">
                          <div className="spinner"></div>
                          <span>Running Stage 2: Peer rankings...</span>
                        </div>
                      )}
                      {msg.stage2 && (
                        <Stage2
                          rankings={msg.stage2}
                          labelToModel={msg.metadata?.label_to_model}
                          aggregateRankings={msg.metadata?.aggregate_rankings}
                        />
                      )}

                      {msg.loading?.stage3 && (
                        <div className="stage-loading">
                          <div className="spinner"></div>
                          <span>Running Stage 3: Final synthesis...</span>
                        </div>
                      )}
                      {msg.stage3 && <Stage3 finalResponse={msg.stage3} />}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <span>Consulting the council...</span>
                </div>
              )}

              {streamError && (
                <div className="error-banner">
                  <span>{streamError}</span>
                  <button
                    className="error-dismiss"
                    onClick={() => {
                      if (onCancel) {
                        onCancel();
                      }
                    }}
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {showScrollButton && (
          <button
            className="scroll-to-bottom"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <ArrowDownIcon size={20} />
          </button>
        )}
      </div>

      {conversation && (
        <div className="input-section">
          <form className="input-form" onSubmit={handleSubmit}>
            {attachments.length > 0 && (
              <div className="attachment-chips">
                {attachments.map((att) => (
                  <div key={att.url} className="attachment-chip">
                    <span className="chip-icon">{getFileIcon(att.mime_type)}</span>
                    <div className="chip-info">
                      <span className="chip-name">{att.name}</span>
                      {att.size && <span className="chip-size">{formatFileSize(att.size)}</span>}
                    </div>
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => handleRemoveAttachment(att.url)}
                      aria-label={`Remove ${att.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isUploading && uploadProgress.length > 0 && (
              <div className="upload-progress-container">
                {uploadProgress.map((item, index) => (
                  <div key={index} className="upload-progress-item">
                    <span className="upload-filename">{item.name}</span>
                    <div className="upload-progress-bar">
                      <div
                        className={`upload-progress-fill ${item.error ? 'error' : ''}`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="upload-progress-text">
                      {item.error ? '✕ Failed' : `${item.progress}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {renderCostBadge()}

            <button
              type="button"
              className="configure-button"
              onClick={() => setSettingsExpanded(true)}
              aria-label="Configure case study settings"
            >
              <SettingsIcon size={16} />
              Configure
            </button>

            <div className="input-wrapper">
              <button
                type="button"
                className="attach-button"
                onClick={handleAttachClick}
                disabled={isUploading}
                aria-label="Attach files"
              >
                <AttachIcon size={20} />
              </button>
              <textarea
                ref={textareaRef}
                className="message-input"
                placeholder="Message LLM Council"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                <SendIcon size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
      
      <Modal
        isOpen={settingsExpanded}
        onClose={() => setSettingsExpanded(false)}
        title="Configure Case Study"
        wide={true}
      >
        <CaseStudySettings
          settings={{
            caseContext,
            keyFacts,
            styleCard,
            exemplarSnippets,
            lengthTarget,
            sensitivities,
            mode,
            sections,
            outputExtras,
            existingDraft,
          }}
          onSettingsChange={handleSettingsChange}
        />
      </Modal>

      <Modal
        isOpen={meetingMinutesSettingsOpen}
        onClose={() => setMeetingMinutesSettingsOpen(false)}
        title="Configure Meeting Minutes"
        wide={true}
      >
        <MeetingMinutesSettings
          settings={{}}
          onSettingsChange={() => {}}
        />
      </Modal>
      
      {/* Hidden file input for attachments */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="*/*"
      />
    </div>
  );
}
