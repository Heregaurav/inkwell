import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import styles from './Layout.module.css'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoMark}>✦</span>
            <span className={styles.logoText}>Inkwell</span>
          </Link>

          <nav className={styles.nav}>
            <Link to="/" className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}>Home</Link>
            <Link to="/explore" className={`${styles.navLink} ${location.pathname === '/explore' ? styles.active : ''}`}>Explore</Link>
            {user && <Link to="/bookmarks" className={`${styles.navLink} ${location.pathname === '/bookmarks' ? styles.active : ''}`}>Saved</Link>}
          </nav>

          <div className={styles.headerActions}>
            {user ? (
              <>
                <button className={styles.writeBtn} onClick={() => navigate('/write')}>
                  <span>Write</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <Link to={`/profile/${user.username}`} className={styles.avatarBtn}>
                  {user.avatar ? <img src={user.avatar} alt={user.username} className={styles.avatarImg} /> : <span className={styles.avatarInitial}>{(user.displayName || user.username)[0].toUpperCase()}</span>}
                </Link>
                <button onClick={logout} className={styles.logoutBtn} title="Sign out">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                </button>
              </>
            ) : (
              <Link to="/auth" className={styles.signInBtn}>Sign in</Link>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>✦ Inkwell</span>
          <span className={styles.footerTag}>The thinking blog platform</span>
        </div>
      </footer>
    </div>
  )
}
