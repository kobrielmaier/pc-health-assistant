import React from 'react';
import './Privacy.css';

/**
 * Privacy & Trust Page
 * Explains what data is collected, how it's used, and our commitments
 */
function Privacy({ onBack }) {
  return (
    <div className="privacy-page">
      <div className="privacy-header">
        <h2>🔒 Privacy & Trust</h2>
        <p className="privacy-subtitle">
          We believe in complete transparency about how this app works and what it does with your data.
        </p>
      </div>

      {/* Core Commitments */}
      <div className="trust-commitments">
        <div className="commitment-card green">
          <div className="commitment-icon">🏠</div>
          <h3>Your Data Stays Local</h3>
          <p>
            All diagnostic scans, system information, and logs stay on YOUR computer.
            We don't send your personal files, passwords, or browsing history anywhere.
          </p>
        </div>

        <div className="commitment-card green">
          <div className="commitment-icon">✋</div>
          <h3>You're Always In Control</h3>
          <p>
            Every system change requires your explicit approval. Investigations are read-only.
            We create restore points before any risky changes.
          </p>
        </div>

        <div className="commitment-card green">
          <div className="commitment-icon">🔓</div>
          <h3>Open Source & Transparent</h3>
          <p>
            This application is open source. You can review the code, see exactly what it does,
            and verify our privacy commitments yourself.
          </p>
        </div>
      </div>

      {/* What We Access */}
      <section className="privacy-section">
        <h3>🔍 What This App Can Access</h3>
        <div className="access-grid">
          <div className="access-item allowed">
            <span className="access-icon">✅</span>
            <div>
              <strong>System Diagnostics</strong>
              <p>Event logs, crash dumps, driver versions, disk space</p>
            </div>
          </div>

          <div className="access-item allowed">
            <span className="access-icon">✅</span>
            <div>
              <strong>Performance Metrics</strong>
              <p>CPU usage, memory usage, running processes, startup programs</p>
            </div>
          </div>

          <div className="access-item allowed">
            <span className="access-icon">✅</span>
            <div>
              <strong>Network Status</strong>
              <p>Connection status, adapter configuration, IP settings</p>
            </div>
          </div>

          <div className="access-item allowed">
            <span className="access-icon">✅</span>
            <div>
              <strong>Hardware Information</strong>
              <p>Device status, driver issues, USB devices</p>
            </div>
          </div>
        </div>
      </section>

      {/* What We DON'T Access */}
      <section className="privacy-section">
        <h3>🚫 What This App CANNOT Access</h3>
        <div className="access-grid">
          <div className="access-item denied">
            <span className="access-icon">❌</span>
            <div>
              <strong>Personal Files</strong>
              <p>Documents, photos, videos, downloads - we never touch these</p>
            </div>
          </div>

          <div className="access-item denied">
            <span className="access-icon">❌</span>
            <div>
              <strong>Passwords & Credentials</strong>
              <p>Browser passwords, saved logins, authentication tokens</p>
            </div>
          </div>

          <div className="access-item denied">
            <span className="access-icon">❌</span>
            <div>
              <strong>Browsing History</strong>
              <p>Websites visited, cookies, browser cache</p>
            </div>
          </div>

          <div className="access-item denied">
            <span className="access-icon">❌</span>
            <div>
              <strong>Private Communications</strong>
              <p>Emails, messages, chat logs</p>
            </div>
          </div>
        </div>
      </section>

      {/* API Usage Disclosure */}
      <section className="privacy-section">
        <h3>🤖 AI & Third-Party Services</h3>
        <div className="api-disclosure">
          <div className="disclosure-box">
            <h4>Anthropic Claude AI</h4>
            <p>
              We use Anthropic's Claude AI to analyze diagnostic information and suggest fixes.
              Here's exactly what gets sent to Anthropic:
            </p>
            <ul>
              <li>✅ System diagnostic results (error messages, crash logs, driver versions)</li>
              <li>✅ Problem descriptions you provide</li>
              <li>✅ Questions you ask the AI assistant</li>
              <li>❌ <strong>NOT</strong> your personal files or private data</li>
              <li>❌ <strong>NOT</strong> your passwords or credentials</li>
              <li>❌ <strong>NOT</strong> your browsing history</li>
            </ul>
            <p className="api-note">
              <strong>Why?</strong> The AI needs to understand your computer's technical issues
              to provide helpful solutions. It only receives diagnostic data necessary for troubleshooting.
            </p>
            <p className="api-link">
              📄 Review Anthropic's privacy policy:
              <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">
                anthropic.com/privacy
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Data Storage */}
      <section className="privacy-section">
        <h3>💾 How Data is Stored</h3>
        <div className="storage-info">
          <div className="storage-item">
            <h4>📋 Audit Logs</h4>
            <p>
              We keep a local log of all diagnostics and fixes applied to your computer.
              This helps you track what's been done and troubleshoot if needed.
            </p>
            <p><strong>Location:</strong> Stored locally on your computer</p>
            <p><strong>Control:</strong> You can view, export, or delete these logs anytime</p>
          </div>

          <div className="storage-item">
            <h4>🗂️ Diagnostic Results</h4>
            <p>
              Scan results and system information are stored locally for quick access in your history.
            </p>
            <p><strong>Retention:</strong> Stored indefinitely until you clear them</p>
          </div>
        </div>
      </section>

      {/* Safety Guardrails */}
      <section className="privacy-section">
        <h3>🛡️ Safety Guardrails</h3>
        <div className="safety-features">
          <div className="safety-feature">
            <span className="safety-icon">🔒</span>
            <div>
              <h4>Read-Only Investigation</h4>
              <p>Diagnostic scans never modify your system. They only read and analyze.</p>
            </div>
          </div>

          <div className="safety-feature">
            <span className="safety-icon">✋</span>
            <div>
              <h4>User Approval Required</h4>
              <p>All system changes require your explicit confirmation. No surprises.</p>
            </div>
          </div>

          <div className="safety-feature">
            <span className="safety-icon">💾</span>
            <div>
              <h4>Automatic Restore Points</h4>
              <p>We create restore points before risky changes so you can roll back if needed.</p>
            </div>
          </div>

          <div className="safety-feature">
            <span className="safety-icon">🚫</span>
            <div>
              <h4>Forbidden Operations</h4>
              <p>Hard-coded blocks prevent dangerous operations like disk formatting or deleting user files.</p>
            </div>
          </div>

          <div className="safety-feature">
            <span className="safety-icon">📝</span>
            <div>
              <h4>Full Audit Trail</h4>
              <p>Every action is logged with timestamps, commands executed, and results.</p>
            </div>
          </div>

          <div className="safety-feature">
            <span className="safety-icon">↩️</span>
            <div>
              <h4>Automatic Rollback</h4>
              <p>If a fix fails, we automatically attempt to restore your system to its previous state.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="privacy-section">
        <h3>🔓 Open Source Commitment</h3>
        <div className="opensource-info">
          <p>
            This application is open source under the MIT License. This means:
          </p>
          <ul>
            <li>✅ You can review the entire source code</li>
            <li>✅ You can verify our privacy commitments</li>
            <li>✅ You can see exactly what operations are performed</li>
            <li>✅ Security researchers can audit the code</li>
            <li>✅ The community can contribute improvements</li>
          </ul>
          <p className="opensource-note">
            <strong>Transparency builds trust.</strong> We have nothing to hide and want you
            to feel confident using this tool.
          </p>
        </div>
      </section>

      {/* Contact & Questions */}
      <section className="privacy-section">
        <h3>❓ Questions or Concerns?</h3>
        <div className="contact-info">
          <p>
            We're committed to transparency and want you to feel safe using this application.
            If you have any questions or concerns about privacy or security:
          </p>
          <ul>
            <li>📧 Review the source code on GitHub</li>
            <li>📝 Check our detailed audit logs (History → View Logs)</li>
            <li>🛡️ Read our security documentation (SECURITY.md)</li>
            <li>💬 Ask questions using the AI chat feature</li>
          </ul>
        </div>
      </section>

      {/* Version & License */}
      <section className="privacy-section version-info">
        <div className="version-box">
          <p><strong>Version:</strong> 0.1.0 (Alpha)</p>
          <p><strong>License:</strong> MIT License</p>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
        </div>
      </section>

      <button className="back-button" onClick={onBack}>
        ← Back to Home
      </button>
    </div>
  );
}

export default Privacy;
