import { useState } from 'react'
import UploadZone from './components/UploadZone'
import DocumentList from './components/DocumentList'
import ChatInterface from './components/ChatInterface'

export default function App() {
  const [refresh, setRefresh] = useState(0)
  const [sidebar, setSidebar] = useState(true)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

      {/* Header */}
      <header style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 20px', height:52,
        borderBottom:'1px solid var(--border)',
        background:'rgba(12,12,16,.85)',
        backdropFilter:'blur(12px)',
        flexShrink:0, zIndex:10,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setSidebar(v=>!v)} style={{
            background:'none', border:'none', cursor:'pointer',
            color:'var(--text-3)', fontSize:17, lineHeight:1, padding:4,
          }}>☰</button>
          <span style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700, letterSpacing:'-.02em' }}>
            DocMind
          </span>
          <span style={{
            fontSize:10, fontFamily:'var(--font-mono)', color:'var(--accent)',
            background:'var(--accent-lo)', padding:'2px 7px',
            borderRadius:4, border:'1px solid rgba(99,179,237,.2)',
          }}>RAG</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)' }}/>
          <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-3)' }}>
            Llama 3.3 70B · ChromaDB · Free
          </span>
        </div>
      </header>

      {/* Body */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: sidebar ? 280 : 0,
          flexShrink:0, overflow:'hidden',
          borderRight: sidebar ? '1px solid var(--border)' : 'none',
          background:'var(--bg)',
          transition:'width .22s cubic-bezier(.4,0,.2,1)',
        }}>
          <div style={{ minWidth:280, height:'100%', overflowY:'auto', padding:18, display:'flex', flexDirection:'column', gap:22 }}>

            <section>
              <Label>Upload Documents</Label>
              <UploadZone onSuccess={() => setRefresh(r=>r+1)} />
            </section>

            <section>
              <Label>Indexed Documents</Label>
              <DocumentList refresh={refresh} />
            </section>

            <section style={{ marginTop:'auto' }}>
              <div style={{
                padding:12, background:'var(--bg-2)', borderRadius:'var(--r-sm)',
                border:'1px solid var(--border)', fontSize:11, color:'var(--text-3)', lineHeight:1.65,
              }}>
                <div style={{ fontWeight:500, color:'var(--text-2)', marginBottom:3 }}>How it works</div>
                Docs are chunked → embedded with <Hl>all-MiniLM-L6-v2</Hl> (free, local) → stored in <Hl>ChromaDB</Hl> → top chunks sent to <Hl>Llama 3.3 70B</Hl> on Groq.
              </div>
            </section>
          </div>
        </aside>

        {/* Chat */}
        <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <ChatInterface />
        </main>
      </div>
    </div>
  )
}

function Label({ children }) {
  return (
    <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-3)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>
      {children}
    </div>
  )
}

function Hl({ children }) {
  return <span style={{ color:'var(--accent)' }}>{children}</span>
}
