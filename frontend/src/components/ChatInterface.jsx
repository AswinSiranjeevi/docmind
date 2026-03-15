import { useState, useRef, useEffect } from 'react'
import SourceCitation from './SourceCitation'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SUGGESTED = [
  'Summarize the key points of this document',
  'What are the main conclusions or findings?',
  'List the most important facts mentioned',
  'What topics does this document cover?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        animation: 'fadeIn 0.25s ease',
        gap: '4px',
      }}
    >
      <div style={{
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        letterSpacing: '0.05em',
        paddingLeft: isUser ? 0 : '2px',
        paddingRight: isUser ? '2px' : 0,
      }}>
        {isUser ? 'YOU' : 'DOCMIND'}
      </div>
      <div style={{
        maxWidth: isUser ? '75%' : '100%',
        padding: isUser ? '10px 16px' : '14px 18px',
        borderRadius: isUser
          ? '16px 16px 4px 16px'
          : '4px 16px 16px 16px',
        background: isUser
          ? 'linear-gradient(135deg, var(--accent) 0%, #9f8fff 100%)'
          : 'var(--bg-2)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? '#fff' : 'var(--text-primary)',
        fontSize: '14px',
        lineHeight: 1.65,
      }}>
        {msg.streaming ? (
          <span>
            {msg.content || ''}
            <span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}>▋</span>
          </span>
        ) : (
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        )}
      </div>
      {!msg.streaming && msg.sources && msg.sources.length > 0 && (
        <div style={{ width: '100%' }}>
          <SourceCitation sources={msg.sources} />
        </div>
      )}
    </div>
  )
}

// Lightweight markdown renderer
function renderMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupbl])(.+)$/gm, (line) => line.trim() ? line : '')
}

export default function ChatInterface({ token }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const question = text || input.trim()
    if (!question || isStreaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question, id: Date.now() }])
    setIsStreaming(true)

    const assistantId = Date.now() + 1
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      sources: [],
      streaming: true,
      id: assistantId,
    }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API}/api/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw)
            if (event.type === 'sources') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, sources: event.sources } : m
              ))
            } else if (event.type === 'token') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + event.content } : m
              ))
            } else if (event.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, streaming: false } : m
              ))
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err.message}`, streaming: false }
            : m
        ))
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            padding: '40px 20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '28px',
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}>
                Ask your documents anything
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Upload files on the left, then start a conversation
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              width: '100%',
              maxWidth: '480px',
            }}>
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    lineHeight: 1.4,
                    transition: 'all var(--transition)',
                    animation: `fadeIn 0.3s ease ${i * 0.07}s both`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-active)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => <Message key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
          background: 'var(--bg-2)',
          border: `1px solid ${isStreaming ? 'var(--border-active)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          transition: 'border-color var(--transition)',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            disabled={isStreaming}
            rows={1}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              resize: 'none',
              lineHeight: 1.6,
              maxHeight: '120px',
              overflow: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            style={{
              background: input.trim() && !isStreaming ? 'var(--accent)' : 'var(--bg-3)',
              border: 'none',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
              color: input.trim() && !isStreaming ? '#fff' : 'var(--text-muted)',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition)',
              flexShrink: 0,
            }}
          >
            {isStreaming ? (
              <div style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid #fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : '↑'}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', paddingLeft: '4px' }}>
          ↵ Send · Shift+↵ Newline
        </div>
      </div>
    </div>
  )
}
