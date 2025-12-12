import './CaseStudySettings.css';

export default function CaseStudySettings({
  settings,
  onSettingsChange,
}) {
  const defaultSections = ['Context', 'Challenge', 'Actions', 'Results', 'Lessons'];
  const defaultStyleCard =
    'Clear, confident narrative voice. Crisp verbs, short paragraphs, vivid but unfussy detail. First-person plural when appropriate, light jargon, each section ends with a takeaway. No hype; mix short and long sentences for rhythm.';

  const {
    caseContext = '',
    keyFacts = '',
    styleCard = defaultStyleCard,
    exemplarSnippets = '',
    lengthTarget = '600-800 words',
    sensitivities = 'Anonymize sensitive names unless explicitly allowed. Avoid legal/medical claims.',
    mode = 'draft',
    sections = defaultSections,
    outputExtras = ['title_options', 'pull_quotes', 'tldr'],
    existingDraft = '',
  } = settings;

  const handleChange = (field, value) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  const toggleSection = (name) => {
    const newSections = sections.includes(name)
      ? sections.filter((s) => s !== name)
      : [...sections, name].filter((s) => defaultSections.includes(s))
        .sort((a, b) => defaultSections.indexOf(a) - defaultSections.indexOf(b));
    handleChange('sections', newSections);
  };

  const toggleExtra = (name) => {
    const newExtras = outputExtras.includes(name)
      ? outputExtras.filter((s) => s !== name)
      : [...outputExtras, name];
    handleChange('outputExtras', newExtras);
  };

  return (
    <div className="case-study-settings-modal">
      <div className="settings-mode-selector">
            <label className="mode-label">Mode</label>
            <div className="mode-options">
              <label className="mode-option">
                <input
                  type="radio"
                  name="mode"
                  value="draft"
                  checked={mode === 'draft'}
                  onChange={(e) => handleChange('mode', e.target.value)}
                />
                <span>Draft</span>
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  name="mode"
                  value="edit"
                  checked={mode === 'edit'}
                  onChange={(e) => handleChange('mode', e.target.value)}
                />
                <span>Edit existing</span>
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  name="mode"
                  value="fact_check"
                  checked={mode === 'fact_check'}
                  onChange={(e) => handleChange('mode', e.target.value)}
                />
                <span>Fact-check</span>
              </label>
            </div>
          </div>

          <div className="settings-grid">
            <div className="settings-field">
              <label htmlFor="case-context">Case context</label>
              <textarea
                id="case-context"
                rows={3}
                placeholder="Industry, company type, audience, goal, stakes..."
                value={caseContext}
                onChange={(e) => handleChange('caseContext', e.target.value)}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="key-facts">Key facts & metrics</label>
              <textarea
                id="key-facts"
                rows={3}
                placeholder="Timeline, actors, constraints, metrics, quotes, sources..."
                value={keyFacts}
                onChange={(e) => handleChange('keyFacts', e.target.value)}
              />
            </div>

            <div className="settings-field full-width">
              <label htmlFor="style-card">Style card</label>
              <textarea
                id="style-card"
                rows={3}
                placeholder="Tone, POV, pacing, sentence length, verbs to favor/avoid..."
                value={styleCard}
                onChange={(e) => handleChange('styleCard', e.target.value)}
              />
            </div>

            <div className="settings-field full-width">
              <label htmlFor="exemplar">Exemplar snippets (optional)</label>
              <textarea
                id="exemplar"
                rows={2}
                placeholder="Paste 1-2 sample paragraphs that represent your voice."
                value={exemplarSnippets}
                onChange={(e) => handleChange('exemplarSnippets', e.target.value)}
              />
            </div>

            <div className="settings-field">
              <label>Sections</label>
              <div className="section-pills">
                {defaultSections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    className={`pill ${sections.includes(sec) ? 'active' : ''}`}
                    onClick={() => toggleSection(sec)}
                  >
                    {sections.includes(sec) && '✓ '}{sec}
                  </button>
                ))}
              </div>
              <p className="field-hint">Click to toggle sections; order is preserved as listed.</p>
            </div>

            <div className="settings-field">
              <label htmlFor="length">Length target</label>
              <input
                id="length"
                type="text"
                value={lengthTarget}
                onChange={(e) => handleChange('lengthTarget', e.target.value)}
                placeholder="e.g., 600-800 words"
              />
              <label htmlFor="sensitivities" className="stacked-label">
                Sensitivities
              </label>
              <input
                id="sensitivities"
                type="text"
                value={sensitivities}
                onChange={(e) => handleChange('sensitivities', e.target.value)}
                placeholder="Anonymization, legal/ethics guardrails..."
              />
            </div>

            <div className="settings-field">
              <label>Output extras</label>
              <div className="section-pills">
                {[
                  { key: 'title_options', label: 'Title options' },
                  { key: 'pull_quotes', label: 'Pull quotes' },
                  { key: 'tldr', label: 'TL;DR' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`pill ${outputExtras.includes(opt.key) ? 'active' : ''}`}
                    onClick={() => toggleExtra(opt.key)}
                  >
                    {outputExtras.includes(opt.key) && '✓ '}{opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(mode === 'edit' || mode === 'fact_check') && (
              <div className="settings-field full-width">
                <label htmlFor="existing">Existing draft to refine or check</label>
                <textarea
                  id="existing"
                  rows={3}
                  placeholder="Paste the draft to improve or fact-check."
                  value={existingDraft}
                  onChange={(e) => handleChange('existingDraft', e.target.value)}
                />
              </div>
            )}
          </div>
    </div>
  );
}
