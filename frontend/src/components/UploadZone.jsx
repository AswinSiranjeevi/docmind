import { useState, useRef, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function UploadZone({ onUploadSuccess, token }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const fileInputRef = useRef(null)

  const handleFiles = useCallback(async (files) => {
    const file = files[0]
    if (!file) return

    setUploading(true)
    setUploadStatus(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      setUploadStatus({ type: 'success', message: `✓ ${file.name} — ${data.chunks_created} chunks indexed` })
      onUploadSuccess?.()
    } catch (err) {
      setUploadStatus({ type: 'error', message: `✗ ${err.message}` })
    } finally {
      setUploading(false)
    }
  }, [onUploadSuccess, token])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragging ? 'var(--accent-glow)' : 'var(--bg-2)',
          transition: 'all var(--transition)',
          opacity: uploading ? 0.7 : 1,
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Processing document...</span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⬆</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Click to upload</span> or drag & drop
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>PDF · TXT · DOCX · MD · Max 20MB</span>
            </div>
          </>
        )}
      </div>
      {uploadStatus && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          background: uploadStatus.type === 'success' ? 'rgba(74, 222, 128, 0.08)' : 'rgba(248, 113, 113, 0.08)',
          color: uploadStatus.type === 'success' ? 'var(--success)' : 'var(--error)',
          border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
          animation: 'fadeIn 0.2s ease',
        }}>
          {uploadStatus.message}
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx,.md" style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)} />
    </div>
  )
}
