import { useState } from 'react'
import LoginGate from './components/LoginGate'
import UploadZone from './components/UploadZone'
import DocumentList from './components/DocumentList'
import ChatInterface from './components/ChatInterface'

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('docmind_token') || '')
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogin = (t) => {
    sessionStorage.setItem('docmind_token', t)
    setToken(t)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('docmind_token')
    setToken('')
  }

  if (!token) return <LoginGate onLogin={handleLogin} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '56px', borderBottom: '1px solid var(--border)',
        background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(12px)',
        flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', padding: '4px' }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '-0.02em' }}>DocMind</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(124, 111, 255, 0.2)' }}>RAG</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Llama-3.3-70b · ChromaDB</span>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: sidebarOpen ? '300px' : '0', flexShrink: 0, overflow: 'hidden', borderRight: sidebarOpen ? '1px solid var(--border)' : 'none', background: 'var(--bg)', display: 'flex', flexDirection: 'column', transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '300px' }}>
            <section>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Upload Documents</div>
              <UploadZone onUploadSuccess={() => setRefreshKey(k => k + 1)} token={token} />
            </section>
            <section>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Indexed Documents</div>
              <DocumentList refreshTrigger={refreshKey} token={token} />
            </section>
            <section style={{ marginTop: 'auto' }}>
              <div style={{ padding: '14px', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>How it works</div>
                Documents are chunked, embedded with <span style={{ color: 'var(--accent)' }}>all-MiniLM-L6-v2</span>, stored in <span style={{ color: 'var(--accent)' }}>ChromaDB</span>, and retrieved via cosine similarity for <span style={{ color: 'var(--accent)' }}>Llama-3.3-70b</span> to answer.
              </div>
            </section>
          </div>
        </aside>
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatInterface token={token} />
        </main>
      </div>
    </div>
  )
}
