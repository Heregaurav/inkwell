// TopicPage.jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { postsAPI, topicsAPI, searchAPI } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import PostCard from '../components/ui/PostCard'
import toast from 'react-hot-toast'
import styles from './TopicPage.module.css'

export function TopicPage() {
  const { slug } = useParams()
  const { user } = useAuthStore()
  const [topic, setTopic] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    topicsAPI.list().then(r => {
      const t = r.data.topics?.find(t => t.slug === slug)
      if (t) {
        setTopic(t)
        setFollowing(user?.followedTopics?.includes(t._id))
        postsAPI.list({ topic: t._id, limit: 30 })
          .then(res => setPosts(res.data.posts || []))
          .catch(() => setPosts([]))
      }
      setLoading(false)
    }).catch(() => {
      setTopic(null)
      setPosts([])
      setLoading(false)
    })
  }, [slug, user])

  const handleFollow = async () => {
    if (!user) return toast.error('Sign in to follow topics')
    try {
      const res = await topicsAPI.follow(topic._id)
      setFollowing(res.data.following)
      toast.success(res.data.following ? `Following ${topic.name}` : 'Unfollowed')
    } catch {}
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--faint)' }}>Loading…</div>
  if (!topic) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--faint)' }}>Topic not found</div>

  return (
    <div className={styles.page}>
      <div className={styles.header} style={{ '--tc': topic.color || '#7c5ce5' }}>
        <div className={styles.topicDot} />
        <div>
          <h1 className={styles.topicName}>{topic.name}</h1>
          {topic.description && <p className={styles.topicDesc}>{topic.description}</p>}
          <div className={styles.topicStats}>
            <span><strong>{topic.postCount ?? posts.length}</strong> posts</span>
            <span>·</span>
            <span><strong>{topic.followerCount ?? 0}</strong> followers</span>
          </div>
        </div>
        <button className={`${styles.followBtn} ${following ? styles.following : ''}`} style={{ '--tc': topic.color || '#7c5ce5' }} onClick={handleFollow}>
          {following ? '✓ Following' : 'Follow'}
        </button>
      </div>

      <div className={styles.grid}>
        {posts.length === 0
          ? <p style={{ color: 'var(--faint)', fontSize: '14px' }}>No posts in this topic yet.</p>
          : posts.map(p => <PostCard key={p._id} post={p} />)
        }
      </div>
    </div>
  )
}

// ExplorePage.jsx

import { Link } from 'react-router-dom'

export function ExplorePage() {
  const [results, setResults] = useState({ posts: [], topics: [], users: [] })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!search.trim()) {
      setResults({ posts: [], topics: [], users: [] })
      return
    }

    setLoading(true)
    searchAPI.query(search)
      .then(r => setResults({ posts: r.data.posts || [], topics: r.data.topics || [], users: r.data.users || [] }))
      .catch(() => setResults({ posts: [], topics: [], users: [] }))
      .finally(() => setLoading(false))
  }, [search])

  return (
    <div className={styles.explorePage}>
      <h1 className={styles.exploreTitle}>Search posts, topics, and authors</h1>
      <input
        className={styles.searchInput}
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search for posts, topics, or people…"
      />

      {loading && <p style={{ color: 'var(--faint)', fontSize: '14px', marginTop: '2rem' }}>Searching…</p>}

      {!loading && !search.trim() && (
        <p style={{ color: 'var(--faint)', fontSize: '14px', marginTop: '2rem' }}>Start typing to search posts, topics, and authors.</p>
      )}

      {!loading && search.trim() && results.posts.length === 0 && results.topics.length === 0 && results.users.length === 0 && (
        <p style={{ color: 'var(--faint)', fontSize: '14px', marginTop: '2rem' }}>No results found for "{search}".</p>
      )}

      {!loading && results.topics.length > 0 && (
        <section className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Topics</h2>
          <div className={styles.topicsGrid}>
            {results.topics.map(t => (
              <Link key={t._id} to={`/topic/${t.slug}`} className={styles.topicCard} style={{ '--tc': t.color || '#7c5ce5' }}>
                <div className={styles.topicCardDot} />
                <h3 className={styles.topicCardName}>{t.name}</h3>
                {t.description && <p className={styles.topicCardDesc}>{t.description}</p>}
                <div className={styles.topicCardStats}>
                  <span>{t.postCount ?? 0} posts</span>
                  <span>{t.followerCount ?? 0} followers</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && results.users.length > 0 && (
        <section className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Authors</h2>
          <div className={styles.userGrid}>
            {results.users.map(user => (
              <Link key={user._id} to={`/profile/${user.username}`} className={styles.userCard}>
                <div className={styles.userAvatar}>{user.avatar ? <img src={user.avatar} alt={user.displayName || user.username} /> : (user.displayName || user.username)[0].toUpperCase()}</div>
                <div>
                  <h3 className={styles.userName}>{user.displayName || user.username}</h3>
                  {user.bio && <p className={styles.userBio}>{user.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && results.posts.length > 0 && (
        <section className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Posts</h2>
          <div className={styles.topicsGrid}>
            {results.posts.map(post => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// BookmarksPage.jsx
import { usersAPI } from '../utils/api'

export function BookmarksPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersAPI.bookmarks().then(r => { setPosts(r.data.posts || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className={styles.bookmarksPage}>
      <h1 className={styles.bookmarksTitle}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        Saved posts
      </h1>
      {loading
        ? <div style={{ color: 'var(--faint)', fontSize: '14px' }}>Loading…</div>
        : posts.length === 0
          ? <div className={styles.emptyBookmarks}>
              <p>No saved posts yet.</p>
              <p style={{ fontSize: '13px', marginTop: '6px' }}>Bookmark posts while reading to save them here.</p>
            </div>
          : <div className={styles.bookmarksGrid}>{posts.map(p => <PostCard key={p._id} post={p} />)}</div>
      }
    </div>
  )
}
