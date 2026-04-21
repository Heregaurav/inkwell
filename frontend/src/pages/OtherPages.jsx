// TopicPage.jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { postsAPI , topicsAPI} from '../utils/api'
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
            <span>{topic.postCount || posts.length} posts</span>
            <span>·</span>
            <span>{topic.followerCount || 0} followers</span>
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
  const [topics, setTopics] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    topicsAPI.list({ search: search || undefined })
      .then(r => setTopics(r.data.topics || []))
      .catch(() => setTopics([]))
  }, [search])

  return (
    <div className={styles.explorePage}>
      <h1 className={styles.exploreTitle}>Explore topics</h1>
      <input
        className={styles.searchInput}
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search topics…"
      />
      {topics.length === 0
        ? <p style={{ color: 'var(--faint)', fontSize: '14px', marginTop: '2rem' }}>No topics found. Topics are created when writers tag their posts.</p>
        : (
          <div className={styles.topicsGrid}>
            {topics.map(t => (
              <Link key={t._id} to={`/topic/${t.slug}`} className={styles.topicCard} style={{ '--tc': t.color || '#7c5ce5' }}>
                <div className={styles.topicCardDot} />
                <h3 className={styles.topicCardName}>{t.name}</h3>
                {t.description && <p className={styles.topicCardDesc}>{t.description}</p>}
                <div className={styles.topicCardStats}>
                  <span>{t.postCount || 0} posts</span>
                  <span>{t.followerCount || 0} followers</span>
                </div>
              </Link>
            ))}
          </div>
        )
      }
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
