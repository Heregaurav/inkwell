// ProfilePage.jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usersAPI } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import PostCard from '../components/ui/PostCard'
import toast from 'react-hot-toast'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { username } = useParams()
  const normalizedUsername = (username || '').replace(/^@/, '')
  const { user: me } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    if (!normalizedUsername) {
      setProfile(null)
      setPosts([])
      setLoading(false)
      return
    }

    setLoading(true)
    usersAPI.profile(normalizedUsername)
      .then(r => {
        setProfile(r.data.user)
        setPosts(r.data.posts || [])
        if (me) setFollowing(r.data.user.followers?.some(id => id === me._id || id?._id === me._id))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [normalizedUsername, me?._id])

  const handleFollow = async () => {
    if (!me) return toast.error('Sign in to follow')
    try {
      const res = await usersAPI.follow(profile._id)
      setFollowing(res.data.following)
    } catch {}
  }

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--faint)' }}>Loading…</div>
  if (!profile) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--faint)' }}>User not found</div>

  const isMe = me?._id === profile._id || me?.username === normalizedUsername

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {profile.avatar
            ? <img src={profile.avatar} alt={profile.username} className={styles.avatarImg} />
            : <span className={styles.avatarInitial}>{(profile.displayName || profile.username)[0].toUpperCase()}</span>
          }
        </div>
        <div className={styles.info}>
          <h1 className={styles.name}>{profile.displayName || profile.username}</h1>
          <p className={styles.handle}>@{profile.username}</p>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          <div className={styles.stats}>
            <span><strong>{posts.length}</strong> posts</span>
            <span><strong>{profile.followers?.length || 0}</strong> followers</span>
            <span><strong>{profile.followedAuthors?.length || 0}</strong> following</span>
          </div>
        </div>
        <div className={styles.actions}>
          {isMe
            ? <Link to="/write" className={styles.writeBtn}>New post</Link>
            : <button className={`${styles.followBtn} ${following ? styles.following : ''}`} onClick={handleFollow}>
                {following ? 'Following' : 'Follow'}
              </button>
          }
        </div>
      </div>

      {profile.followedTopics?.length > 0 && (
        <div className={styles.followedTopics}>
          <span className={styles.topicsLabel}>Follows:</span>
          {profile.followedTopics.map(t => (
            <Link key={t._id} to={`/topic/${t.slug}`} className={styles.topicPill} style={{ '--tc': t.color || '#7c5ce5' }}>{t.name}</Link>
          ))}
        </div>
      )}

      <div className={styles.postsGrid}>
        {posts.length === 0
          ? <p className={styles.empty}>No posts yet.</p>
          : posts.map(p => <PostCard key={p._id} post={p} />)
        }
      </div>
    </div>
  )
}
