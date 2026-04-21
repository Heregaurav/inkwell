import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { postsAPI, feedAPI, topicsAPI } from '../utils/api'
import PostCard from '../components/ui/PostCard'
import styles from './HomePage.module.css'

export default function HomePage() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState([])
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(user ? 'feed' : 'latest')

  useEffect(() => {
    topicsAPI.list().then(r => setTopics(r.data.topics?.slice(0, 10) || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const fetch = activeTab === 'feed' && user
      ? feedAPI.get({ limit: 20 })
      : postsAPI.list({ limit: 20, page: 1 })
    fetch.then(r => { setPosts(r.data.posts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeTab, user])

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.sideSection}>
            <h3 className={styles.sideTitle}>Topics</h3>
            <div className={styles.topicList}>
              {topics.map(t => (
                <Link key={t._id} to={`/topic/${t.slug}`} className={styles.topicItem} style={{ '--tc': t.color || '#7c5ce5' }}>
                  <span className={styles.topicDot} />
                  <span>{t.name}</span>
                  <span className={styles.topicCount}>{t.postCount || 0}</span>
                </Link>
              ))}
            </div>
          </div>
          {!user && (
            <div className={styles.cta}>
              <p className={styles.ctaText}>Write, share, and discover ideas that matter.</p>
              <Link to="/auth" className={styles.ctaBtn}>Start writing free</Link>
            </div>
          )}
        </aside>

        <main className={styles.feed}>
          <div className={styles.tabs}>
            {user && <button className={`${styles.tab} ${activeTab === 'feed' ? styles.active : ''}`} onClick={() => setActiveTab('feed')}>For you</button>}
            <button className={`${styles.tab} ${activeTab === 'latest' ? styles.active : ''}`} onClick={() => setActiveTab('latest')}>Latest</button>
          </div>

          {loading ? (
            <div className={styles.loadingGrid}>
              {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} />)}
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.empty}>
              <p>{activeTab === 'feed' ? 'Follow some topics or authors to build your feed.' : 'No posts yet. Be the first to write!'}</p>
              <Link to="/write" className={styles.emptyBtn}>Write something</Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {posts.map((post, i) => (
                <PostCard key={post._id} post={post} variant={i === 0 ? 'featured' : 'default'} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
