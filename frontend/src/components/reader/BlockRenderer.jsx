import { useState } from 'react'
import styles from './BlockRenderer.module.css'

function ParagraphBlock({ block }) {
  return <div className={styles.paragraph} dangerouslySetInnerHTML={{ __html: block.content || '' }} />
}

function HeadingBlock({ block }) {
  const Tag = `h${block.level || 2}`
  return <Tag className={styles[`h${block.level || 2}`]} dangerouslySetInnerHTML={{ __html: block.content || '' }} />
}

function ImageBlock({ block }) {
  return (
    <figure className={styles.imageFigure}>
      <img src={block.content} alt="" className={styles.blockImage} loading="lazy" />
    </figure>
  )
}

function CodeBlock({ block }) {
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)

  const runCode = () => {
    setRunning(true)
    setOutput('')
    try {
      const logs = []
      const originalLog = console.log
      console.log = (...args) => logs.push(args.map(String).join(' '))
      // eslint-disable-next-line no-new-func
      new Function(block.code?.source || '')()
      console.log = originalLog
      setOutput(logs.join('\n') || '(no output)')
    } catch (err) {
      setOutput(`Error: ${err.message}`)
    }
    setRunning(false)
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLang}>{block.code?.language || 'code'}</span>
        {block.code?.runnable && (
          <button className={styles.runBtn} onClick={runCode} disabled={running}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            {running ? 'Running…' : 'Run'}
          </button>
        )}
      </div>
      <pre className={styles.codePre}><code>{block.code?.source || ''}</code></pre>
      {output && (
        <div className={styles.codeOutput}>
          <span className={styles.outputLabel}>Output</span>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  )
}

function CalloutBlock({ block }) {
  const icons = { info: 'ℹ', warning: '⚠', tip: '💡', danger: '⚡' }
  return (
    <div className={`${styles.callout} ${styles[`callout-${block.callout?.style || 'info'}`]}`}>
      <span className={styles.calloutIcon}>{icons[block.callout?.style || 'info']}</span>
      <div dangerouslySetInnerHTML={{ __html: block.callout?.text || block.content || '' }} />
    </div>
  )
}

function QuizBlock({ block, postId, onQuizAnswer }) {
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleAnswer = async (index) => {
    if (result) return
    setSelected(index)
    setLoading(true)
    try {
      const res = await onQuizAnswer(block.id, index)
      setResult(res.data)
    } catch (err) {
      if (err.response?.data?.isCorrect !== undefined) {
        setResult(err.response.data)
      }
    }
    setLoading(false)
  }

  const totalResps = result?.totalResponses || block.quiz?.totalResponses || 0

  return (
    <div className={styles.quiz}>
      <div className={styles.quizHeader}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
        Knowledge check
      </div>
      <p className={styles.quizQuestion}>{block.quiz?.question}</p>
      <div className={styles.quizOptions}>
        {block.quiz?.options?.map((opt, i) => {
          let cls = styles.quizOption
          if (result) {
            if (i === result.correctIndex) cls = `${styles.quizOption} ${styles.correct}`
            else if (i === selected && !result.isCorrect) cls = `${styles.quizOption} ${styles.wrong}`
            else cls = `${styles.quizOption} ${styles.dimmed}`
          } else if (selected === i) {
            cls = `${styles.quizOption} ${styles.selected}`
          }
          const count = result?.optionCounts?.[i] || 0
          const pct = totalResps > 0 ? Math.round((count / totalResps) * 100) : 0
          return (
            <button key={i} className={cls} onClick={() => handleAnswer(i)} disabled={!!result || loading}>
              <span className={styles.optionLetter}>{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
              {result && <span className={styles.optionPct}>{pct}%</span>}
            </button>
          )
        })}
      </div>
      {result && (
        <div className={`${styles.quizFeedback} ${result.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
          <strong>{result.isCorrect ? '✓ Correct!' : '✗ Not quite.'}</strong>
          {result.explanation && <span> {result.explanation}</span>}
          {totalResps > 0 && <span className={styles.quizStat}> {totalResps} readers answered.</span>}
        </div>
      )}
    </div>
  )
}

function PollBlock({ block, onPollVote }) {
  const [voted, setVoted] = useState(false)
  const [votes, setVotes] = useState(block.poll?.votes || {})
  const [totalVotes, setTotalVotes] = useState(block.poll?.totalVotes || 0)
  const [loading, setLoading] = useState(false)

  const handleVote = async (index) => {
    if (voted || loading) return
    setLoading(true)
    try {
      const res = await onPollVote(block.id, index)
      setVotes(res.data.votes)
      setTotalVotes(res.data.totalVotes)
      setVoted(true)
    } catch (err) {
      if (err.response?.status === 409) setVoted(true)
    }
    setLoading(false)
  }

  return (
    <div className={styles.poll}>
      <div className={styles.pollHeader}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        Poll
      </div>
      <p className={styles.pollQuestion}>{block.poll?.question}</p>
      <div className={styles.pollOptions}>
        {block.poll?.options?.map((opt, i) => {
          const count = votes[String(i)] || 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          return (
            <button key={i} className={`${styles.pollOption} ${voted ? styles.pollVoted : ''}`} onClick={() => handleVote(i)} disabled={voted || loading}>
              <div className={styles.pollBar} style={{ width: voted ? `${pct}%` : '0%' }} />
              <span className={styles.pollText}>{opt}</span>
              {voted && <span className={styles.pollPct}>{pct}%</span>}
            </button>
          )
        })}
      </div>
      {voted && <p className={styles.pollTotal}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>}
    </div>
  )
}

export default function BlockRenderer({ blocks, postId, onPollVote, onQuizAnswer }) {
  return (
    <div className={styles.blocks}>
      {blocks.map(block => {
        switch (block.type) {
          case 'paragraph': return <ParagraphBlock key={block.id} block={block} />
          case 'heading': return <HeadingBlock key={block.id} block={block} />
          case 'image': return <ImageBlock key={block.id} block={block} />
          case 'code': return <CodeBlock key={block.id} block={block} />
          case 'callout': return <CalloutBlock key={block.id} block={block} />
          case 'quiz': return <QuizBlock key={block.id} block={block} postId={postId} onQuizAnswer={onQuizAnswer} />
          case 'poll': return <PollBlock key={block.id} block={block} onPollVote={onPollVote} />
          case 'divider': return <hr key={block.id} className={styles.divider} />
          default: return null
        }
      })}
    </div>
  )
}
