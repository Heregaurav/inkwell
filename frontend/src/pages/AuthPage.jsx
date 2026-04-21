import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' })
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuthStore()
  const navigate = useNavigate()

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Welcome back!')
      } else {
        await register({ email: form.email, password: form.password, username: form.username, displayName: form.displayName })
        toast.success('Account created!')
      }
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>✦</span>
          <span className={styles.brandName}>Inkwell</span>
        </div>

        <h1 className={styles.heading}>{mode === 'login' ? 'Welcome back' : 'Start writing'}</h1>
        <p className={styles.sub}>{mode === 'login' ? 'Sign in to your account' : 'Create a free account'}</p>

        <div className={styles.modeTabs}>
          <button className={`${styles.modeTab} ${mode === 'login' ? styles.modeActive : ''}`} onClick={() => setMode('login')}>Sign in</button>
          <button className={`${styles.modeTab} ${mode === 'register' ? styles.modeActive : ''}`} onClick={() => setMode('register')}>Create account</button>
        </div>

        <form onSubmit={submit} className={styles.form}>
          {mode === 'register' && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Username</label>
                <input className={styles.input} type="text" placeholder="yourname" value={form.username} onChange={e => set('username', e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Display name</label>
                <input className={styles.input} type="text" placeholder="Your Name" value={form.displayName} onChange={e => set('displayName', e.target.value)} />
              </div>
            </>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input className={styles.input} type="password" placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'} value={form.password} onChange={e => set('password', e.target.value)} required />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button className={styles.switchBtn} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>

        <Link to="/" className={styles.backLink}>← Back to Inkwell</Link>
      </div>

      <div className={styles.visual}>
        <blockquote className={styles.quote}>
          "Writing is thinking. To write well is to think clearly."
        </blockquote>
        <p className={styles.quoteAuthor}>— David McCullough</p>
        <div className={styles.features}>
          {['AI-assisted writing', 'Interactive quizzes & polls', 'Three reader modes', 'Threaded discussions', 'ELI5 simplification'].map(f => (
            <div key={f} className={styles.featureItem}>
              <span className={styles.featureDot}>✦</span>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
