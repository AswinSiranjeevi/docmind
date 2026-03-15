import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function DocumentList({ refreshTrigger, token }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API}/api/documents`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setDocs(data.documents || [])
    } catch (err) {
      console.error('Failed to fetch docs', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [refreshTrigger])

  const handleDelete = async (docId) => {
    setDeleting(docId)
    try {
      await fetch(`${API}/api/documents/${docId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setDocs(prev => prev.filter(d => d.doc_id !== docId))
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>Loading...</div>
  )

  if (docs.length === 0) return (
    <div style={{
      color: 'var(--text-muted)',
      fontSize: '12px',
      textAlign: 'center',
      padding: '20px',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-sm)',
    }}>
      No documents yet
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {docs.map((doc, i) => (
        <div
          key={doc.doc_id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background: 'var(--bg-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            animation: `slideIn 0.2s ease ${i * 0.05}s both`,
          }}
        >
          <span style={{ fontSize: '16px' }}>
            {doc.source_file.endsWith('.pdf') ? '📄' :
             doc.source_file.endsWith('.docx') ? '📋' :
             doc.source_file.endsWith('.md') ? '📌' : '📝'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {doc.source_file}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {doc.total_chunks} chunks
            </div>
          </div>
          <button
            onClick={() => handleDelete(doc.doc_id)}
            disabled={deleting === doc.doc_id}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '14px',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color var(--transition)',
              opacity: deleting === doc.doc_id ? 0.5 : 1,
            }}
            onMouseEnter={e => e.target.style.color = 'var(--error)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            title="Remove document"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
