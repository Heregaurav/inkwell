import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { commentsAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import styles from './CommentSection.module.css'

function CommentItem({ comment, postId, depth = 0 }) {
  const { user } = useAuthStore()
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState([])
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [likes, setLikes] = useState(comment.likes || 0)
  const [liked, setLiked] = useState(comment.isLiked || false)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadReplies = async () => {
    if (loadingReplies) return
    setLoadingReplies(true)
    try {
      const res = await commentsAPI.list(postId, { parentId: comment._id })
      setReplies(res.data.comments || [])
    } catch {}
    setLoadingReplies(false)
  }

  const toggleReplies = () => {
    if (!showReplies && replies.length === 0) loadReplies()
    setShowReplies(v => !v)
  }

  const handleLike = async () => {
    if (!user) return toast.error('Sign in to like')
    try {
      const res = await commentsAPI.like(comment._id)
      setLiked(res.data.liked)
      setLikes(res.data.likes)
    } catch {}
  }

  const handleReply = async () => {
    if (!replyText.trim()) return
    setSubmitting(true)
    try {
      const res = await commentsAPI.create(postId, { content: replyText, parentId: comment._id })
      setReplies(prev => [res.data.comment, ...prev])
      setReplyText('')
      setReplying(false)
      setShowReplies(true)
      toast.success('Reply posted')
    } catch { toast.error('Failed to post reply') }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await commentsAPI.delete(comment._id)
      toast.success('Comment deleted')
    } catch { toast.error('Failed to delete') }
  }

  const author = comment.authorId
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })

  return (
    <div className={`${styles.comment} ${comment.isTopComment ? styles.topComment : ''} ${depth > 0 ? styles.reply : ''}`}>
      {comment.isTopComment && (
        <div className={styles.topBadge}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Top insight
        </div>
      )}
      <div className={styles.commentHeader}>
        <Link to={`/@${author?.username}`} className={styles.commentAuthor}>
          {author?.avatar
            ? <img src={author.avatar} className={styles.commentAvatar} alt="" />
            : <span className={styles.commentInitial}>{(author?.displayName || author?.username || '?')[0].toUpperCase()}</span>
          }
          <span className={styles.commentName}>{author?.displayName || author?.username}</span>
        </Link>
        <span className={styles.commentTime}>{timeAgo}</span>
      </div>
      <p className={styles.commentBody}>{comment.content}</p>
      <div className={styles.commentActions}>
        <button className={`${styles.commentAction} ${liked ? styles.commentLiked : ''}`} onClick={handleLike}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          {likes > 0 && <span>{likes}</span>}
        </button>
        {depth === 0 && (
          <button className={styles.commentAction} onClick={() => setReplying(v => !v)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Reply
          </button>
        )}
        {user && user._id === (author?._id || comment.authorId) && (
          <button className={`${styles.commentAction} ${styles.deleteAction}`} onClick={handleDelete}>Delete</button>
        )}
        {depth === 0 && (
          <button className={styles.commentAction} onClick={toggleReplies} style={{ marginLeft: 'auto' }}>
            {showReplies ? 'Hide' : 'Replies'}
          </button>
        )}
      </div>
      {replying && (
        <div className={styles.replyBox}>
          <textarea className={styles.replyInput} placeholder={`Reply to ${author?.displayName || author?.username}…`} value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} autoFocus />
          <div className={styles.replyBtns}>
            <button className={styles.replyCancel} onClick={() => setReplying(false)}>Cancel</button>
            <button className={styles.replySubmit} onClick={handleReply} disabled={submitting || !replyText.trim()}>{submitting ? 'Posting…' : 'Reply'}</button>
          </div>
        </div>
      )}
      {showReplies && (
        <div className={styles.replies}>
          {loadingReplies ? <div className={styles.loadingReplies}>Loading…</div>
            : replies.map(r => <CommentItem key={r._id} comment={r} postId={postId} depth={depth + 1} />)}
          {!loadingReplies && replies.length === 0 && <p className={styles.noReplies}>No replies yet.</p>}
        </div>
      )}
    </div>
  )
}

export default function CommentSection({ postId }) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    commentsAPI.list(postId)
      .then(r => { setComments(r.data.comments || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [postId])

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await commentsAPI.create(postId, { content: text })
      setComments(prev => [res.data.comment, ...prev])
      setText('')
      toast.success('Comment posted!')
    } catch { toast.error('Failed to post comment') }
    setSubmitting(false)
  }

  const topComments = comments.filter(c => c.isTopComment)
  const regularComments = comments.filter(c => !c.isTopComment)

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Discussion <span className={styles.count}>{comments.length}</span></h2>
      {user ? (
        <div className={styles.compose}>
          <div className={styles.composeAvatar}>
            {user.avatar ? <img src={user.avatar} className={styles.composeAvatarImg} alt="" />
              : <span className={styles.composeInitial}>{(user.displayName || user.username)[0].toUpperCase()}</span>}
          </div>
          <div className={styles.composeRight}>
            <textarea className={styles.composeInput} placeholder="Share your thoughts…" value={text} onChange={e => setText(e.target.value)} rows={3} />
            <div className={styles.composeBtns}>
              <span className={styles.composeHint}>Select any text in the article for an ELI5 simplification</span>
              <button className={styles.composeSubmit} onClick={handleSubmit} disabled={submitting || !text.trim()}>{submitting ? 'Posting…' : 'Post comment'}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.signInPrompt}><Link to="/auth" className={styles.signInLink}>Sign in</Link> to join the discussion</div>
      )}
      {loading ? (
        <div className={styles.loadingComments}>{[...Array(3)].map((_, i) => <div key={i} className={styles.commentSkeleton} />)}</div>
      ) : (
        <>
          {topComments.length > 0 && (
            <div className={styles.topSection}>
              <div className={styles.topSectionLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Top insights
              </div>
              {topComments.map(c => <CommentItem key={c._id} comment={c} postId={postId} />)}
            </div>
          )}
          <div className={styles.commentsList}>
            {regularComments.map(c => <CommentItem key={c._id} comment={c} postId={postId} />)}
            {comments.length === 0 && <p className={styles.noComments}>No comments yet. Be the first to share your thoughts.</p>}
          </div>
        </>
      )}
    </div>
  )
}
