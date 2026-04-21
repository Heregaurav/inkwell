import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { postsAPI, aiAPI, topicsAPI } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
// import { v4 as uuid } from 'crypto'
import styles from './WritePage.module.css'

// Simple uuid fallback
// const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const genId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
// ─── Block editors ───────────────────────────────────────────────────────────

function ParagraphEditor({ block, onChange, onDelete, onAdd }) {
  return (
    <div className={styles.blockWrap}>
      <textarea
        className={styles.paraInput}
        value={block.content || ''}
        onChange={e => onChange({ ...block, content: e.target.value })}
        placeholder="Write something…"
        rows={3}
      />
      <BlockActions onDelete={onDelete} onAdd={onAdd} />
    </div>
  )
}

function HeadingEditor({ block, onChange, onDelete, onAdd }) {
  const levels = [1, 2, 3]
  return (
    <div className={styles.blockWrap}>
      <div className={styles.headingRow}>
        <div className={styles.levelPicker}>
          {levels.map(l => (
            <button key={l} className={`${styles.lvlBtn} ${(block.level || 2) === l ? styles.lvlActive : ''}`}
              onClick={() => onChange({ ...block, level: l })}>H{l}</button>
          ))}
        </div>
        <input
          className={`${styles.headingInput} ${styles[`headingH${block.level || 2}`]}`}
          value={block.content || ''}
          onChange={e => onChange({ ...block, content: e.target.value })}
          placeholder={`Heading ${block.level || 2}`}
        />
      </div>
      <BlockActions onDelete={onDelete} onAdd={onAdd} />
    </div>
  )
}

function CodeEditor({ block, onChange, onDelete, onAdd }) {
  const langs = ['javascript', 'python', 'typescript', 'go', 'rust', 'bash', 'sql', 'html', 'css']
  const c = block.code || {}
  return (
    <div className={styles.blockWrap}>
      <div className={styles.codeEditorHeader}>
        <select className={styles.langSelect} value={c.language || 'javascript'}
          onChange={e => onChange({ ...block, code: { ...c, language: e.target.value } })}>
          {langs.map(l => <option key={l}>{l}</option>)}
        </select>
        <label className={styles.runnableToggle}>
          <input type="checkbox" checked={c.runnable || false}
            onChange={e => onChange({ ...block, code: { ...c, runnable: e.target.checked } })} />
          Runnable
        </label>
      </div>
      <textarea
        className={styles.codeTextarea}
        value={c.source || ''}
        onChange={e => onChange({ ...block, code: { ...c, source: e.target.value } })}
        placeholder="// your code here"
        rows={6}
        spellCheck={false}
      />
      <BlockActions onDelete={onDelete} onAdd={onAdd} />
    </div>
  )
}

function QuizEditor({ block, onChange, onDelete, onAdd }) {
  const q = block.quiz || { question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' }
  const update = (patch) => onChange({ ...block, quiz: { ...q, ...patch } })
  return (
    <div className={`${styles.blockWrap} ${styles.quizEditorWrap}`}>
      <div className={styles.interactiveLabel}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
        Quiz Block
      </div>
      <input className={styles.quizQ} value={q.question} onChange={e => update({ question: e.target.value })} placeholder="Ask a question…" />
      {q.options.map((opt, i) => (
        <div key={i} className={styles.quizOptRow}>
          <button className={`${styles.correctBtn} ${q.correctIndex === i ? styles.correctActive : ''}`}
            onClick={() => update({ correctIndex: i })} title="Mark correct">
            {q.correctIndex === i ? '✓' : String.fromCharCode(65 + i)}
          </button>
          <input className={styles.quizOptInput} value={opt}
            onChange={e => { const opts = [...q.options]; opts[i] = e.target.value; update({ options: opts }) }}
            placeholder={`Option ${String.fromCharCode(65 + i)}`} />
        </div>
      ))}
      <input className={styles.explanInput} value={q.explanation || ''} onChange={e => update({ explanation: e.target.value })} placeholder="Explanation (shown after answering)…" />
      <BlockActions onDelete={onDelete} onAdd={onAdd} />
    </div>
  )
}

function PollEditor({ block, onChange, onDelete, onAdd }) {
  const p = block.poll || { question: '', options: ['', ''] }
  const update = (patch) => onChange({ ...block, poll: { ...p, ...patch } })
  const addOpt = () => update({ options: [...p.options, ''] })
  const removeOpt = (i) => { if (p.options.length <= 2) return; const o = [...p.options]; o.splice(i, 1); update({ options: o }) }
  return (
    <div className={`${styles.blockWrap} ${styles.pollEditorWrap}`}>
      <div className={styles.interactiveLabel} style={{ '--lc': 'var(--gold)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        Poll Block
      </div>
      <input className={styles.quizQ} value={p.question} onChange={e => update({ question: e.target.value })} placeholder="Poll question…" />
      {p.options.map((opt, i) => (
        <div key={i} className={styles.pollOptRow}>
          <span className={styles.pollDot} />
          <input className={styles.quizOptInput} value={opt}
            onChange={e => { const o = [...p.options]; o[i] = e.target.value; update({ options: o }) }}
            placeholder={`Option ${i + 1}`} />
          {p.options.length > 2 && <button className={styles.removeOpt} onClick={() => removeOpt(i)}>✕</button>}
        </div>
      ))}
      <button className={styles.addOptBtn} onClick={addOpt}>+ Add option</button>
      <BlockActions onDelete={onDelete} onAdd={onAdd} />
    </div>
  )
}

function CalloutEditor({ block, onChange, onDelete, onAdd }) {
  const c = block.callout || { style: 'info', text: '' }
  const styles_map = ['info', 'tip', 'warning', 'danger']
  return (
    <div className={styles.blockWrap}>
      <div className={styles.calloutRow}>
        <select className={styles.langSelect} value={c.style}
          onChange={e => onChange({ ...block, callout: { ...c, style: e.target.value } })}>
          {styles_map.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <input className={styles.calloutInput} value={c.text || block.content || ''}
          onChange={e => onChange({ ...block, callout: { ...c, text: e.target.value }, content: e.target.value })}
          placeholder="Callout text…" />
      </div>
      <BlockActions onDelete={onDelete} onAdd={onAdd} />
    </div>
  )
}

function BlockActions({ onDelete, onAdd }) {
  return (
    <div className={styles.blockActions}>
      <button className={styles.blockAction} onClick={onAdd} title="Add block below">+</button>
      <button className={`${styles.blockAction} ${styles.deleteAction}`} onClick={onDelete} title="Delete block">✕</button>
    </div>
  )
}

function BlockEditor({ block, onChange, onDelete, onAdd }) {
  switch (block.type) {
    case 'paragraph': return <ParagraphEditor block={block} onChange={onChange} onDelete={onDelete} onAdd={onAdd} />
    case 'heading': return <HeadingEditor block={block} onChange={onChange} onDelete={onDelete} onAdd={onAdd} />
    case 'code': return <CodeEditor block={block} onChange={onChange} onDelete={onDelete} onAdd={onAdd} />
    case 'quiz': return <QuizEditor block={block} onChange={onChange} onDelete={onDelete} onAdd={onAdd} />
    case 'poll': return <PollEditor block={block} onChange={onChange} onDelete={onDelete} onAdd={onAdd} />
    case 'callout': return <CalloutEditor block={block} onChange={onChange} onDelete={onDelete} onAdd={onAdd} />
    case 'divider': return (
      <div className={styles.blockWrap}>
        <hr className={styles.dividerPreview} />
        <BlockActions onDelete={onDelete} onAdd={onAdd} />
      </div>
    )
    default: return null
  }
}

// ─── AddBlockMenu ──────────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Paragraph', icon: '¶', desc: 'Plain text' },
  { type: 'heading', label: 'Heading', icon: 'H', desc: 'H1, H2, H3', extra: { level: 2 } },
  { type: 'code', label: 'Code', icon: '</>', desc: 'With syntax highlight', extra: { code: { language: 'javascript', source: '', runnable: false } } },
  { type: 'quiz', label: 'Quiz', icon: '?', desc: 'Test your readers', extra: { quiz: { question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' } } },
  { type: 'poll', label: 'Poll', icon: '⬡', desc: 'Gather opinions', extra: { poll: { question: '', options: ['', ''] } } },
  { type: 'callout', label: 'Callout', icon: '!', desc: 'Info, tip, warning', extra: { callout: { style: 'info', text: '' } } },
  { type: 'divider', label: 'Divider', icon: '—', desc: 'Horizontal rule' },
]

function AddBlockMenu({ onAdd, onClose }) {
  return (
    <div className={styles.addMenu}>
      {BLOCK_TYPES.map(bt => (
        <button key={bt.type} className={styles.addMenuItem}
          onClick={() => { onAdd(bt.type, bt.extra || {}); onClose(); }}>
          <span className={styles.addMenuIcon}>{bt.icon}</span>
          <div>
            <span className={styles.addMenuLabel}>{bt.label}</span>
            <span className={styles.addMenuDesc}>{bt.desc}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Main WritePage ────────────────────────────────────────────────────────

export default function WritePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState([{ id: genId(), type: 'paragraph', content: '' }])
  const [topics, setTopics] = useState([])
  const [selectedTopics, setSelectedTopics] = useState([])
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [postId, setPostId] = useState(id || null)
  const [showAddMenu, setShowAddMenu] = useState(null) // index
  const [responseTo, setResponseTo] = useState(searchParams.get('responseTo') || null)

  // AI state
  const [titleSuggestions, setTitleSuggestions] = useState([])
  const [loadingTitles, setLoadingTitles] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
  const [aiPanel, setAiPanel] = useState(false)

  useEffect(() => {
    topicsAPI.list().then(r => setTopics(r.data.topics || []))
  }, [])

  useEffect(() => {
    if (id) {
      postsAPI.list({ author: user?._id }).then(r => {
        const p = r.data.posts?.find(p => p._id === id)
        if (p) { setTitle(p.title); setBlocks(p.blocks || []); setSelectedTopics(p.topics?.map(t => t._id) || []); setTags(p.tags || []); setCoverImage(p.coverImage || '') }
      }).catch(() => toast.error('Could not load post'))
    }
  }, [id])

  const getContent = () => blocks.map(b => b.content || b.quiz?.question || b.poll?.question || b.code?.source || '').join(' ')

  const suggestTitles = async () => {
    const content = getContent()
    if (!content.trim() && !title.trim()) return toast.error('Write some content first')
    setLoadingTitles(true)
    setAiPanel(true)
    try {
      const res = await aiAPI.suggestTitles(content || title)
      setTitleSuggestions(res.data.titles || [])
    } catch { toast.error('AI unavailable') }
    setLoadingTitles(false)
  }

  const generateTags = async () => {
    const content = getContent()
    if (!content.trim() && !title.trim()) return toast.error('Write some content first')
    setLoadingTags(true)
    try {
      const res = await aiAPI.generateTags(title, content)
      const newTags = (res.data.tags || []).filter(t => t.confidence > 0.5).map(t => t.tag)
      setTags(prev => [...new Set([...prev, ...newTags])])
      toast.success(`${newTags.length} tags added!`)
    } catch { toast.error('AI unavailable') }
    setLoadingTags(false)
  }

  const save = async (status = 'draft') => {
    if (!title.trim()) return toast.error('Add a title first')
    const setLoading = status === 'published' ? setPublishing : setSaving
    setLoading(true)
    try {
      const data = { title, blocks, topics: selectedTopics, tags, status, responseTo, coverImage }
      let res
      if (postId) {
        res = await postsAPI.update(postId, data)
      } else {
        res = await postsAPI.create(data)
        setPostId(res.data.post._id)
      }
      if (status === 'published') {
        toast.success('Published!')
        navigate(`/post/${res.data.post.slug}`)
      } else {
        toast.success('Saved as draft')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    }
    setLoading(false)
  }

  const updateBlock = (index, newBlock) => {
    setBlocks(prev => prev.map((b, i) => i === index ? newBlock : b))
  }

  const deleteBlock = (index) => {
    setBlocks(prev => {
      if (prev.length === 1) return [{ id: genId(), type: 'paragraph', content: '' }]
      return prev.filter((_, i) => i !== index)
    })
  }

  const addBlock = (afterIndex, type, extra = {}) => {
    const newBlock = { id: genId(), type, content: '', ...extra }
    setBlocks(prev => {
      const copy = [...prev]
      copy.splice(afterIndex + 1, 0, newBlock)
      return copy
    })
  }

  const addTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase().replace(/,/g, '')
      if (!tags.includes(tag)) setTags(prev => [...prev, tag])
      setTagInput('')
    }
  }

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} onClick={() => navigate(-1)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className={styles.toolRight}>
          <button className={`${styles.toolBtn} ${styles.aiBtn}`} onClick={suggestTitles} disabled={loadingTitles}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            {loadingTitles ? 'Thinking…' : 'AI Titles'}
          </button>
          <button className={`${styles.toolBtn} ${styles.aiBtn}`} onClick={generateTags} disabled={loadingTags}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            {loadingTags ? 'Tagging…' : 'AI Tags'}
          </button>
          <button className={styles.saveBtn} onClick={() => save('draft')} disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button className={styles.publishBtn} onClick={() => save('published')} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      <div className={styles.editorLayout}>
        {/* Main Editor */}
        <main className={styles.editor}>
          {responseTo && (
            <div className={styles.responseNote}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Writing a response to another post
            </div>
          )}

          {/* Cover image */}
          <div className={styles.coverRow}>
            <input
              className={styles.coverInput}
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="Cover image URL (optional)…"
            />
          </div>

          {/* Title */}
          <textarea
            className={styles.titleInput}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title…"
            rows={2}
          />

          {/* AI Title Suggestions */}
          {aiPanel && titleSuggestions.length > 0 && (
            <div className={styles.titleSuggestions}>
              <div className={styles.suggestHeader}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                AI title suggestions
                <button className={styles.closeAi} onClick={() => setAiPanel(false)}>✕</button>
              </div>
              {titleSuggestions.map((s, i) => (
                <button key={i} className={styles.titleChip} onClick={() => { setTitle(s.text); setAiPanel(false) }}>
                  <span className={styles.titleChipStyle}>{s.style}</span>
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {/* Blocks */}
          <div className={styles.blocks}>
            {blocks.map((block, i) => (
              <div key={block.id} className={styles.blockContainer}>
                <BlockEditor
                  block={block}
                  onChange={(nb) => updateBlock(i, nb)}
                  onDelete={() => deleteBlock(i)}
                  onAdd={() => setShowAddMenu(showAddMenu === i ? null : i)}
                />
                {showAddMenu === i && (
                  <AddBlockMenu
                    onAdd={(type, extra) => addBlock(i, type, extra)}
                    onClose={() => setShowAddMenu(null)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Add first block button */}
          <button className={styles.addBlockBtn} onClick={() => setShowAddMenu(blocks.length - 1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add block
          </button>
        </main>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideSection}>
            <h3 className={styles.sideTitle}>Topics</h3>
            <div className={styles.topicGrid}>
              {topics.slice(0, 16).map(t => (
                <button
                  key={t._id}
                  className={`${styles.topicBtn} ${selectedTopics.includes(t._id) ? styles.topicSelected : ''}`}
                  onClick={() => setSelectedTopics(prev => prev.includes(t._id) ? prev.filter(x => x !== t._id) : [...prev, t._id])}
                  style={{ '--tc': t.color || '#7c5ce5' }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sideSection}>
            <h3 className={styles.sideTitle}>Tags</h3>
            <div className={styles.tagsWrap}>
              {tags.map(tag => (
                <span key={tag} className={styles.tagChip}>
                  {tag}
                  <button className={styles.removeTag} onClick={() => setTags(prev => prev.filter(t => t !== tag))}>✕</button>
                </span>
              ))}
              <input
                className={styles.tagInput}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Add tag, press Enter…"
              />
            </div>
          </div>

          <div className={styles.sideSection}>
            <h3 className={styles.sideTitle}>Writing tips</h3>
            <ul className={styles.tips}>
              <li>Use <strong>AI Titles</strong> to find the best headline</li>
              <li>Add a <strong>Quiz block</strong> to test reader comprehension</li>
              <li>A <strong>Poll</strong> collects reader opinions in real-time</li>
              <li>Mark code blocks as <strong>runnable</strong> for tech posts</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
