// ReaderModeToggle.jsx
import styles from './ReaderModeToggle.module.css'

const MODES = [
  { id: 'quick', label: 'Quick Read', icon: '⚡' },
  { id: 'deep', label: 'Deep Dive', icon: '📖' },
  { id: 'exam', label: 'Exam Mode', icon: '✓' }
]

export default function ReaderModeToggle({ mode, onChange }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.toggle}>
        {MODES.map(m => (
          <button key={m.id} className={`${styles.btn} ${mode === m.id ? styles.active : ''}`} onClick={() => onChange(m.id)}>
            <span className={styles.icon}>{m.icon}</span>
            <span className={styles.label}>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
