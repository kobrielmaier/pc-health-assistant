export default function Home() {
  return (
    <main style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px'
    }}>
      <h1>PC Health Assistant API</h1>
      <p>This is the backend API for PC Health Assistant.</p>

      <h2>Endpoints</h2>
      <ul>
        <li><code>POST /api/v1/chat</code> - AI chat (non-streaming)</li>
        <li><code>POST /api/v1/chat/stream</code> - AI chat (streaming)</li>
        <li><code>POST /api/auth/validate</code> - Validate API key</li>
      </ul>

      <h2>Authentication</h2>
      <p>All endpoints require an API key passed via the <code>X-API-Key</code> header.</p>

      <h2>Get an API Key</h2>
      <p>Subscribe to PC Health Assistant to receive your API key.</p>

      <h2>Status</h2>
      <p style={{ color: 'green' }}>✓ API is operational</p>
    </main>
  );
}
