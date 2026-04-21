import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import styles from './PostCard.module.css'

export default function PostCard({ post, variant = 'default' }) {
  const author = post.authorId
  const timeAgo = post.publishedAt ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true }) : 'draft'

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      {post.coverImage && (
        <Link to={`/post/${post.slug}`} className={styles.coverLink}>
          <img src={post.coverImage} alt={post.title} className={styles.cover} loading="lazy" />
        </Link>
      )}
      <div className={styles.body}>
        <div className={styles.meta}>
          {author && (
            <Link to={`/@${author.username}`} className={styles.author}>
              {author.avatar
                ? <img src={author.avatar} className={styles.authorAvatar} alt={author.username} />
                : <span className={styles.authorInitial}>{(author.displayName || author.username)[0].toUpperCase()}</span>
              }
              <span>{author.displayName || author.username}</span>
            </Link>
          )}
          <span className={styles.dot}>·</span>
          <span className={styles.time}>{timeAgo}</span>
          {post.stats?.readTime && <><span className={styles.dot}>·</span><span className={styles.readTime}>{post.stats.readTime} min read</span></>}
        </div>

        <Link to={`/post/${post.slug}`} className={styles.titleLink}>
          <h2 className={styles.title}>{post.title}</h2>
        </Link>

        {(post.aiMeta?.shortSummary || post.aiMeta?.keyTakeaway) && (
          <p className={styles.summary}>{post.aiMeta.shortSummary || post.aiMeta.keyTakeaway}</p>
        )}

        <div className={styles.footer}>
          <div className={styles.topics}>
            {post.topics?.slice(0, 3).map(t => (
              <Link key={t._id} to={`/topic/${t.slug}`} className={styles.topic} style={{ '--tc': t.color || '#7c5ce5' }}>
                {t.name}
              </Link>
            ))}
          </div>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              {post.stats?.likes || 0}
            </span>
            <span className={styles.stat}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {post.stats?.views || 0}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
