import { useState, useRef, useEffect } from 'react'
import SourceCitation from './SourceCitation'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SUGGESTIONS = [
  'Summarize the key points of this document',
  'What are the main conclusions or findings?',
  'List the most important facts mentioned',
  'What topics does this document cover?',
]

function md(text) {
  if (!text) return ''
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_,c) => `<pre><code>${c.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^[-•] (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g,'<ul>$1</ul>')
    .replace(/\n\n/g,'<br/><br/>')
}

function Msg({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser?'flex-end':'flex-start', animation:'fadeUp .2s ease', gap:3 }}>
      <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-3)', letterSpacing:'.06em', padding: isUser?'0 2px':'0 2px' }}>
        {isUser ? 'YOU' : 'DOCMIND'}
      </div>
      <div style={{
        maxWidth: isUser ? '72%' : '100%',
        padding: isUser ? '9px 15px' : '12px 16px',
        borderRadius: isUser ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
        background: isUser
          ? 'linear-gradient(135deg,#4a9cc7 0%,#63b3ed 100%)'
          : 'var(--bg-2)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? '#fff' : 'var(--text-1)',
        fontSize: 14,
        lineHeight: 1.65,
      }}>
        {msg.streaming
          ? <span>{msg.content}<span style={{ animation:'blink 1s infinite', display:'inline-block', marginLeft:1 }}>▋</span></span>
          : <div className="md" dangerouslySetInnerHTML={{ __html: md(msg.content) }} />
        }
      </div>
      {!msg.streaming && msg.sources?.length > 0 && (
        <div style={{ width:'100%' }}>
          <SourceCitation sources={msg.sources} />
        </div>
      )}
    </div>
  )
}

export default function ChatInterface() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const taRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const send = async (text) => {
    const q = (text || input).trim()
    if (!q || streaming) return
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'

    const uid = Date.now()
    const aid = uid + 1
    setMessages(p => [...p,
      { id:uid, role:'user', content:q },
      { id:aid, role:'assistant', content:'', sources:[], streaming:true },
    ])
    setStreaming(true)

    try {
      const res = await fetch(`${API}/api/query/stream`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ question:q }),
      })

      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.detail || 'Request failed')
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream:true })
        const lines = buf.split('\n')
        buf = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'sources')
              setMessages(p => p.map(m => m.id===aid ? {...m, sources:evt.sources} : m))
            else if (evt.type === 'token')
              setMessages(p => p.map(m => m.id===aid ? {...m, content:m.content+evt.content} : m))
            else if (evt.type === 'done')
              setMessages(p => p.map(m => m.id===aid ? {...m, streaming:false} : m))
          } catch {}
        }
      }
    } catch (e) {
      setMessages(p => p.map(m => m.id===aid
        ? { ...m, content:`Error: ${e.message}`, streaming:false }
        : m
      ))
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:18 }}>
        {messages.length === 0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28, padding:'40px 20px' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:600, letterSpacing:'-.02em', marginBottom:6 }}>
                Ask your documents anything
              </div>
              <div style={{ color:'var(--text-3)', fontSize:13 }}>
                Upload files on the left, then start a conversation
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, width:'100%', maxWidth:460 }}>
              {SUGGESTIONS.map((q,i) => (
                <button key={i} onClick={() => send(q)} style={{
                  padding:'11px 13px',
                  background:'var(--bg-2)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-sm)', color:'var(--text-2)',
                  fontSize:12, cursor:'pointer', textAlign:'left', lineHeight:1.45,
                  transition:'all var(--ease)',
                  animation:`fadeUp .3s ease ${i*.07}s both`,
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border-hi)';e.currentTarget.style.color='var(--text-1)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-2)'}}
                >{q}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(m => <Msg key={m.id} msg={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)' }}>
        <div style={{
          display:'flex', gap:10, alignItems:'flex-end',
          background:'var(--bg-2)',
          border:`1px solid ${streaming?'var(--border-hi)':'var(--border)'}`,
          borderRadius:'var(--r)', padding:'10px 12px',
          transition:'border-color var(--ease)',
        }}>
          <textarea
            ref={taRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
            placeholder="Ask a question about your documents…"
            disabled={streaming}
            rows={1}
            style={{
              flex:1, background:'none', border:'none', outline:'none',
              color:'var(--text-1)', fontSize:14,
              fontFamily:'var(--font-body)', resize:'none',
              lineHeight:1.6, maxHeight:120, overflow:'auto',
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim()||streaming}
            style={{
              background: input.trim()&&!streaming ? 'var(--accent)' : 'var(--bg-3)',
              border:'none', borderRadius:7,
              width:32, height:32, flexShrink:0,
              cursor: input.trim()&&!streaming ? 'pointer':'not-allowed',
              color: input.trim()&&!streaming ? '#fff':'var(--text-3)',
              fontSize:15, display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all var(--ease)',
            }}
          >
            {streaming
              ? <div style={{ width:13,height:13, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
              : '↑'
            }
          </button>
        </div>
        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:5, paddingLeft:2 }}>
          ↵ Send &nbsp;·&nbsp; Shift+↵ New line
        </div>
      </div>
    </div>
  )
}
