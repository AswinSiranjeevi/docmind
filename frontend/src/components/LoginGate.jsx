import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function LoginGate({ onLogin }) {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!apiKey.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Invalid API key')
      onLogin(data.access_token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: '380px', padding: '32px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', marginBottom: '6px' }}>DocMind</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enter your APP_API_KEY to continue</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="APP_API_KEY"
            style={{
              background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              padding: '12px 14px', color: 'var(--text-primary)', fontSize: '14px',
              fontFamily: 'var(--font-mono)', outline: 'none', width: '100%',
            }}
          />
          <button
            onClick={handleLogin}
            disabled={loading || !apiKey.trim()}
            style={{
              padding: '12px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: apiKey.trim() ? 'var(--accent)' : 'var(--bg-3)',
              color: apiKey.trim() ? '#000' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '14px', cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-display)',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>
          {error && (
            <div style={{ fontSize: '12px', color: 'var(--error)', textAlign: 'center' }}>✗ {error}</div>
          )}
        </div>

        <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          Set <code style={{ color: 'var(--accent)' }}>APP_API_KEY</code> in your backend <code>.env</code> file
        </div>
      </div>
    </div>
  )
}
