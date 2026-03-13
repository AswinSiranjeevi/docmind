import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const EXT_ICON = { pdf:'📄', docx:'📋', txt:'📝', md:'📌' }
const icon = (name) => EXT_ICON[name.split('.').pop()] || '📄'

export default function DocumentList({ refresh }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  const fetch_ = async () => {
    try {
      const r = await fetch(`${API}/api/documents`)
      const d = await r.json()
      setDocs(d.documents || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetch_() }, [refresh])

  const del = async (id) => {
    setDeleting(id)
    try {
      await fetch(`${API}/api/documents/${id}`, { method:'DELETE' })
      setDocs(p => p.filter(d => d.doc_id !== id))
    } catch {}
    finally { setDeleting(null) }
  }

  if (loading) return <div style={{ color:'var(--text-3)', fontSize:12 }}>Loading…</div>

  if (!docs.length) return (
    <div style={{
      border:'1px dashed var(--border)', borderRadius:'var(--r-sm)',
      padding:'18px', textAlign:'center',
      color:'var(--text-3)', fontSize:12,
    }}>
      No documents yet
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {docs.map((doc, i) => (
        <div key={doc.doc_id} style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'9px 11px',
          background:'var(--bg-2)',
          border:'1px solid var(--border)',
          borderRadius:'var(--r-sm)',
          animation:`slideIn .2s ease ${i*.04}s both`,
        }}>
          <span style={{ fontSize:15, flexShrink:0 }}>{icon(doc.source_file)}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {doc.source_file}
            </div>
            <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>
              {doc.total_chunks} chunks
            </div>
          </div>
          <button
            onClick={() => del(doc.doc_id)}
            disabled={deleting === doc.doc_id}
            style={{
              background:'none', border:'none', cursor:'pointer',
              color:'var(--text-3)', fontSize:13, padding:4,
              borderRadius:4, transition:'color var(--ease)',
              opacity: deleting === doc.doc_id ? .4 : 1,
            }}
            onMouseEnter={e => e.target.style.color='var(--red)'}
            onMouseLeave={e => e.target.style.color='var(--text-3)'}
          >✕</button>
        </div>
      ))}
    </div>
  )
}
