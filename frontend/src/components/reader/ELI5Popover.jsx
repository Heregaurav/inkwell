import { useEffect, useRef } from 'react'
import styles from './ELI5Popover.module.css'

export default function ELI5Popover({ content, position, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className={styles.popover}
      style={{ top: position.top, left: Math.min(position.left, window.innerWidth - 340) }}
    >
      <div className={styles.header}>
        <span className={styles.badge}>ELI5</span>
        <span className={styles.subtitle}>Simplified explanation</span>
        <button className={styles.close} onClick={onClose}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className={styles.body}>
        {content ? (
          <div className={styles.contentWrap}>
            <p className={styles.text}>{typeof content === 'string' ? content : content.simplified}</p>
            {typeof content === 'object' && content?.analogy && <p className={styles.analogy}>{content.analogy}</p>}
            {typeof content === 'object' && content?.oneLiner && <p className={styles.oneLiner}>{content.oneLiner}</p>}
            {typeof content === 'object' && content?.whyItMatters && <div className={styles.callout}><span className={styles.calloutLabel}>Why it matters</span><p>{content.whyItMatters}</p></div>}
            {typeof content === 'object' && content?.example && <div className={styles.callout}><span className={styles.calloutLabel}>Example</span><p>{content.example}</p></div>}
            {typeof content === 'object' && content?.keyPoint && <p className={styles.keyPoint}>{content.keyPoint}</p>}
          </div>
        ) : (
          <div className={styles.loading}>
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </div>
  )
}
