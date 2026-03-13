import { useState } from 'react'

export default function SourceCitation({ sources }) {
  const [open, setOpen] = useState(null)
  if (!sources?.length) return null

  return (
    <div style={{ marginTop:10 }}>
      <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-3)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:5 }}>
        Sources ({sources.length})
      </div>
      {sources.map((src, i) => (
        <div key={i} style={{ marginBottom:4 }}>
          <button
            onClick={() => setOpen(open===i ? null : i)}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:7,
              padding:'7px 10px',
              background:'var(--bg)', border:'1px solid var(--border)',
              borderRadius: open===i ? 'var(--r-sm) var(--r-sm) 0 0' : 'var(--r-sm)',
              cursor:'pointer', color:'var(--text-2)',
              fontSize:11, fontFamily:'var(--font-mono)', textAlign:'left',
              transition:'border-color var(--ease)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor='var(--border-hi)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
          >
            <span style={{ background:'var(--accent-lo)', color:'var(--accent)', borderRadius:3, padding:'1px 5px', fontWeight:600, flexShrink:0 }}>
              {i+1}
            </span>
            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {src.source_file}{src.page != null ? ` · p.${src.page+1}` : ''}
            </span>
            <span style={{ color: src.relevance_score>.7?'var(--green)':src.relevance_score>.4?'var(--yellow)':'var(--text-3)', flexShrink:0 }}>
              {Math.round(src.relevance_score*100)}%
            </span>
            <span style={{ color:'var(--text-3)', flexShrink:0 }}>{open===i?'▲':'▼'}</span>
          </button>
          {open===i && (
            <div style={{
              padding:'9px 11px',
              background:'var(--bg)', color:'var(--text-2)',
              border:'1px solid var(--border)', borderTop:'none',
              borderRadius:'0 0 var(--r-sm) var(--r-sm)',
              fontSize:12, fontStyle:'italic', lineHeight:1.6,
              animation:'fadeIn .15s ease',
            }}>
              "{src.excerpt}"
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
