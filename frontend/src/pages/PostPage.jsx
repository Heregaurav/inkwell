import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { postsAPI, commentsAPI, aiAPI, usersAPI } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import io from 'socket.io-client'
import BlockRenderer from '../components/reader/BlockRenderer'
import ReaderModeToggle from '../components/reader/ReaderModeToggle'
import CommentSection from '../components/community/CommentSection'
import ELI5Popover from '../components/reader/ELI5Popover'
import styles from './PostPage.module.css'

export default function PostPage() {
  const { slug } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [readerMode, setReaderMode] = useState('deep')
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [eli5, setEli5] = useState(null)
  const [eli5Pos, setEli5Pos] = useState(null)
  const socketRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    socketRef.current = io({ path: '/socket.io' })
    return () => socketRef.current?.disconnect()
  }, [])

  useEffect(() => {
    setLoading(true)
    postsAPI.get(slug, { readerMode })
      .then(r => {
        setPost(r.data.post)
        setLiked(r.data.post.isLiked || false)
        setBookmarked(r.data.post.isBookmarked || false)
        setLoading(false)
        socketRef.current?.emit('join-post', r.data.post._id)
      })
      .catch(() => { toast.error('Post not found'); navigate('/'); })
  }, [slug, readerMode])

  // Listen for real-time poll updates
  useEffect(() => {
    if (!post || !socketRef.current) return
    socketRef.current.on('poll-update', ({ blockId, votes, totalVotes }) => {
      setPost(prev => {
        if (!prev) return prev
        const blocks = prev.blocks?.map(b => b.id === blockId ? { ...b, poll: { ...b.poll, votes, totalVotes } } : b)
        return { ...prev, blocks }
      })
    })
    return () => socketRef.current?.off('poll-update')
  }, [post?._id])

  const handleLike = async () => {
    if (!user) return toast.error('Sign in to like posts')
    try {
      const res = await postsAPI.like(post._id)
      setLiked(res.data.liked)
      setPost(prev => ({ ...prev, stats: { ...prev.stats, likes: res.data.likes } }))
    } catch {}
  }

  const handleBookmark = async () => {
    if (!user) return toast.error('Sign in to bookmark')
    try {
      const res = await usersAPI.bookmark(post._id)
      setBookmarked(res.data.bookmarked)
      toast.success(res.data.bookmarked ? 'Bookmarked!' : 'Removed from bookmarks')
    } catch {}
  }

  // ELI5 - triggered on text selection
  const handleTextSelection = async () => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length < 20 || text.length > 500) return
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setEli5Pos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX })
    setEli5(null)
    try {
      const res = await aiAPI.eli5(text)
      setEli5(res.data.simplified)
    } catch { setEli5('Could not simplify this text.') }
  }

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.loadingPulse} />
      <div className={styles.loadingPulse} style={{ width: '60%' }} />
      <div className={styles.loadingPulse} style={{ width: '80%', height: '120px' }} />
    </div>
  )

  if (!post) return null
  const author = post.authorId
  const timeAgo = post.publishedAt ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true }) : ''

  return (
    <div className={styles.page}>
      {/* Reader mode toggle - sticky */}
      <ReaderModeToggle mode={readerMode} onChange={setReaderMode} />

      <article className={styles.article}>
        {/* Header */}
        <header className={styles.header}>
          {post.topics?.length > 0 && (
            <div className={styles.topics}>
              {post.topics.map(t => (
                <Link key={t._id} to={`/topic/${t.slug}`} className={styles.topicChip} style={{ '--tc': t.color || '#7c5ce5' }}>{t.name}</Link>
              ))}
            </div>
          )}

          <h1 className={styles.title}>{post.title}</h1>

          {post.aiMeta?.keyTakeaway && readerMode !== 'exam' && (
            <p className={styles.keyTakeaway}>{post.aiMeta.keyTakeaway}</p>
          )}

          <div className={styles.byline}>
            {author && (
              <Link to={`/profile/${author.username}`} className={styles.authorLink}>
                {author.avatar
                  ? <img src={author.avatar} className={styles.authorAvatar} alt={author.username} />
                  : <span className={styles.authorInitial}>{(author.displayName || author.username)[0].toUpperCase()}</span>
                }
                <div>
                  <span className={styles.authorName}>{author.displayName || author.username}</span>
                  <span className={styles.postMeta}>{timeAgo} · {post.stats?.readTime} min read · {post.stats?.views} views</span>
                </div>
              </Link>
            )}
            <div className={styles.actions}>
              <button className={`${styles.actionBtn} ${liked ? styles.liked : ''}`} onClick={handleLike} title="Like">
                <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                <span>{post.stats?.likes || 0}</span>
              </button>
              <button className={`${styles.actionBtn} ${bookmarked ? styles.bookmarked : ''}`} onClick={handleBookmark} title="Bookmark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
              {user && user._id === post.authorId?._id && (
                <Link to={`/write/${post._id}`} className={styles.editBtn}>Edit</Link>
              )}
            </div>
          </div>
        </header>

        {post.coverImage && <img src={post.coverImage} alt={post.title} className={styles.coverImage} />}

        {/* Content based on reader mode */}
        <div className={styles.content} ref={contentRef} onMouseUp={handleTextSelection}>
          {readerMode === 'quick' && post.readerContent && (
            <div className={styles.quickRead}>
              <div className={styles.modeBadge}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Quick Read · ~45 seconds
              </div>
              <p className={styles.quickContent}>{post.readerContent.content}</p>
              {post.readerContent.keyTakeaway && (
                <div className={styles.takeaway}>
                  <strong>Key insight:</strong> {post.readerContent.keyTakeaway}
                </div>
              )}
              <button className={styles.switchDeep} onClick={() => setReaderMode('deep')}>Read the full post →</button>
            </div>
          )}

          {readerMode === 'exam' && post.readerContent && (
            <div className={styles.examMode}>
              <div className={styles.modeBadge} style={{ '--badge-c': 'var(--teal)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                Exam Mode · Key points
              </div>
              {post.readerContent.detailedSummary && (
                <p className={styles.examSummary}>{post.readerContent.detailedSummary}</p>
              )}
              <h3 className={styles.bulletsTitle}>Revision Notes</h3>
              <ul className={styles.bullets}>
                {post.readerContent.bullets?.map((b, i) => <li key={i}>{b}</li>)}
                {(!post.readerContent.bullets || post.readerContent.bullets.length === 0) && (
                  <li>AI summary not yet generated for this post.</li>
                )}
              </ul>
            </div>
          )}

          {readerMode === 'deep' && post.blocks && (
            <BlockRenderer
              blocks={post.blocks}
              postId={post._id}
              onPollVote={(blockId, optionIndex) => postsAPI.pollVote(post._id, blockId, optionIndex)}
              onQuizAnswer={(blockId, selectedIndex) => postsAPI.quizAnswer(post._id, blockId, selectedIndex)}
            />
          )}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className={styles.tags}>
            {post.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
          </div>
        )}

        {/* Response Blogs */}
        {post.responses?.length > 0 && (
          <div className={styles.responses}>
            <h3 className={styles.responsesTitle}>Responses to this post</h3>
            {post.responses.map(r => (
              <Link key={r._id} to={`/post/${r.slug}`} className={styles.responseCard}>
                <div className={styles.responseAuthor}>
                  <span>{r.authorId?.displayName || r.authorId?.username}</span>
                  <span className={styles.responseTime}>{r.publishedAt ? formatDistanceToNow(new Date(r.publishedAt), { addSuffix: true }) : ''}</span>
                </div>
                <h4>{r.title}</h4>
              </Link>
            ))}
          </div>
        )}

        {/* Write Response */}
        {user && (
          <div className={styles.writeResponse}>
            <Link to={`/write?responseTo=${post._id}`} className={styles.writeResponseBtn}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Write a response
            </Link>
          </div>
        )}
      </article>

      {/* Comments */}
      <div className={styles.commentsWrap}>
        <CommentSection postId={post._id} />
      </div>

      {/* ELI5 Popover */}
      {eli5Pos && (
        <ELI5Popover content={eli5} position={eli5Pos} onClose={() => { setEli5(null); setEli5Pos(null); }} />
      )}
    </div>
  )
}
