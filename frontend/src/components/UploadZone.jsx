import { useState, useRef, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function UploadZone({ onSuccess }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null)
  const inputRef = useRef(null)

  const handleFiles = useCallback(async (files) => {
    const file = files[0]
    if (!file) return
    setUploading(true)
    setStatus(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      setStatus({ ok: true, msg: `✓  ${file.name}  ·  ${data.chunks_created} chunks indexed` })
      onSuccess?.()
    } catch (e) {
      setStatus({ ok: false, msg: `✗  ${e.message}` })
    } finally {
      setUploading(false)
    }
  }, [onSuccess])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const s = {
    zone: {
      border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--r)',
      padding: '24px 16px',
      textAlign: 'center',
      cursor: uploading ? 'not-allowed' : 'pointer',
      background: dragging ? 'var(--accent-lo)' : 'var(--bg-2)',
      transition: 'all var(--ease)',
      opacity: uploading ? .65 : 1,
    },
    spinner: {
      width: 22, height: 22, margin: '0 auto 8px',
      border: '2px solid var(--border)',
      borderTop: '2px solid var(--accent)',
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
    },
    hint: { color: 'var(--text-2)', fontSize: 12, lineHeight: 1.8 },
    link: { color: 'var(--accent)', fontWeight: 500 },
    tag:  { color: 'var(--text-3)', fontSize: 11 },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div
        style={s.zone}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {uploading
          ? <><div style={s.spinner}/><div style={s.hint}>Processing…</div></>
          : <>
              <div style={{ fontSize: 24, marginBottom: 6 }}>↑</div>
              <div style={s.hint}>
                <span style={s.link}>Click to upload</span> or drag & drop<br/>
                <span style={s.tag}>PDF · TXT · DOCX · MD</span>
              </div>
            </>
        }
      </div>

      {status && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--r-sm)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          background: status.ok ? 'rgba(104,211,145,.08)' : 'rgba(252,129,129,.08)',
          color: status.ok ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${status.ok ? 'rgba(104,211,145,.2)' : 'rgba(252,129,129,.2)'}`,
          animation: 'fadeIn .2s ease',
        }}>
          {status.msg}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.docx,.md"
        style={{ display:'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
