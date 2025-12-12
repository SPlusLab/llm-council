import './CaseStudySettings.css';

export default function MeetingMinutesSettings({
  settings,
  onSettingsChange,
}) {
  return (
    <div className="case-study-settings-modal">
      <div className="settings-coming-soon">
        <div className="coming-soon-icon">📋</div>
        <h3>Meeting Minutes Settings</h3>
        <p>
          Configure settings for generating professional meeting summaries and action items.
        </p>
        <div className="coming-soon-badge-large" style={{ marginTop: 'var(--space-4)' }}>
          Coming Soon
        </div>
        <p className="coming-soon-description">
          This feature will include options for:
        </p>
        <ul className="coming-soon-features">
          <li>Meeting participants and roles</li>
          <li>Agenda items and discussion topics</li>
          <li>Action items and assignments</li>
          <li>Decision tracking</li>
          <li>Follow-up scheduling</li>
          <li>Output format preferences</li>
        </ul>
      </div>
    </div>
  );
}
