import styles from './Skeleton.module.css'

export const skeletonStyles = styles

function LoadingRegion({ label, className, children }) {
  return <div className={`${styles.region} ${className || ''}`} role="status" aria-label={label} aria-busy="true">{children}</div>
}

function Shape({ className = '' }) {
  return <span className={`${styles.shape} ${className}`} aria-hidden="true" />
}

export function SkeletonFeed({ count = 6 }) {
  return (
    <LoadingRegion label="Loading articles" className={styles.feed}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`${styles.postCard} ${index === 0 ? styles.featured : ''}`} aria-hidden="true">
          <div className={styles.postBody}>
            <div className={styles.meta}><Shape className={styles.avatarSmall} /><Shape className={styles.authorLine} /><Shape className={styles.metaLine} /></div>
            <Shape className={styles.titleLine} />
            <Shape className={`${styles.titleLine} ${styles.titleShort}`} />
            <div className={styles.paragraph}><Shape /><Shape /><Shape className={styles.paragraphShort} /></div>
            <div className={styles.footer}><Shape className={styles.topicLine} /><Shape className={styles.engagementLine} /></div>
          </div>
        </div>
      ))}
    </LoadingRegion>
  )
}

export function SkeletonArticle() {
  return (
    <LoadingRegion label="Loading article" className={styles.article}>
      <div className={styles.articleHeader} aria-hidden="true">
        <div className={styles.topics}><Shape className={styles.topicLine} /><Shape className={styles.topicLine} /></div>
        <Shape className={styles.articleTitle} />
        <Shape className={`${styles.articleTitle} ${styles.articleTitleShort}`} />
        <div className={styles.authorRow}><Shape className={styles.avatarLarge} /><div className={styles.authorDetails}><Shape className={styles.authorLine} /><Shape className={styles.metaLine} /></div></div>
      </div>
      <div className={styles.articleText} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map(index => <div className={styles.paragraph} key={index}><Shape /><Shape /><Shape /><Shape className={index % 2 ? styles.paragraphShort : styles.paragraphMedium} /></div>)}
      </div>
    </LoadingRegion>
  )
}

export function SkeletonProfile() {
  return (
    <LoadingRegion label="Loading profile" className={styles.profile}>
      <div className={styles.profileHeader} aria-hidden="true">
        <Shape className={styles.profileAvatar} />
        <div className={styles.profileInfo}><Shape className={styles.profileName} /><Shape className={styles.profileHandle} /><Shape className={styles.profileBio} /><Shape className={styles.profileStats} /></div>
        <Shape className={styles.profileButton} />
      </div>
      <div className={styles.profilePosts}>{[0, 1, 2, 3].map(index => <div key={index} className={styles.profilePost}><Shape className={styles.metaLine} /><Shape className={styles.titleLine} /><Shape className={`${styles.titleLine} ${styles.titleShort}`} /><div className={styles.paragraph}><Shape /><Shape className={styles.paragraphShort} /></div></div>)}</div>
    </LoadingRegion>
  )
}

export function SkeletonTopic() {
  return (
    <LoadingRegion label="Loading topic" className={styles.topicPage}>
      <div className={styles.topicHeader} aria-hidden="true"><Shape className={styles.topicIcon} /><div className={styles.topicInfo}><Shape className={styles.topicName} /><Shape className={styles.topicDescription} /><Shape className={styles.profileStats} /></div><Shape className={styles.profileButton} /></div>
      <div className={styles.topicPosts}>{[0, 1, 2, 3].map(index => <div key={index} className={styles.profilePost}><Shape className={styles.metaLine} /><Shape className={styles.titleLine} /><Shape className={`${styles.titleLine} ${styles.titleShort}`} /><div className={styles.paragraph}><Shape /><Shape className={styles.paragraphShort} /></div></div>)}</div>
    </LoadingRegion>
  )
}

export function SkeletonComments({ count = 3, compact = false }) {
  return (
    <LoadingRegion label={compact ? 'Loading replies' : 'Loading comments'} className={`${styles.comments} ${compact ? styles.compactComments : ''}`}>
      {Array.from({ length: count }, (_, index) => <div className={styles.comment} key={index} aria-hidden="true"><div className={styles.commentMeta}><Shape className={styles.avatarSmall} /><Shape className={styles.authorLine} /><Shape className={styles.metaLine} /></div><div className={styles.paragraph}><Shape /><Shape className={index % 2 ? styles.paragraphMedium : styles.paragraphShort} /></div></div>)}
    </LoadingRegion>
  )
}

export function SkeletonSearchResults() {
  return (
    <LoadingRegion label="Loading search results" className={styles.searchResults}>
      {[0, 1, 2].map(index => <div className={styles.searchCard} key={index} aria-hidden="true"><Shape className={styles.titleLine} /><Shape className={`${styles.titleLine} ${styles.titleShort}`} /><div className={styles.paragraph}><Shape /><Shape className={styles.paragraphMedium} /></div></div>)}
    </LoadingRegion>
  )
}

export function SkeletonTopics({ count = 5 }) {
  return (
    <LoadingRegion label="Loading topics" className={styles.topicsList}>
      {Array.from({ length: count }, (_, index) => <div className={styles.topicItem} key={index} aria-hidden="true"><Shape className={styles.topicDot} /><Shape className={styles.topicLabel} /></div>)}
    </LoadingRegion>
  )
}

export function SkeletonBookmarks({ count = 4 }) {
  return (
    <LoadingRegion label="Loading saved articles" className={styles.bookmarks}>
      {[...Array(count)].map((_, index) => <div key={index} className={styles.profilePost} aria-hidden="true"><Shape className={styles.metaLine} /><Shape className={styles.titleLine} /><Shape className={`${styles.titleLine} ${styles.titleShort}`} /><div className={styles.paragraph}><Shape /><Shape className={styles.paragraphShort} /></div></div>)}
    </LoadingRegion>
  )
}

export function SkeletonEditor() {
  return (
    <LoadingRegion label="Loading draft editor" className={styles.editor}>
      <div className={styles.editorCover} aria-hidden="true"><Shape /></div>
      <div aria-hidden="true">
        <Shape className={styles.editorTitle} />
        <Shape className={`${styles.editorTitle} ${styles.editorTitleShort}`} />
      </div>
      <div className={styles.editorBlock} aria-hidden="true"><Shape className={styles.editorHeading} /><div className={styles.paragraph}><Shape /><Shape /><Shape className={styles.paragraphMedium} /></div></div>
      <div className={styles.editorBlock} aria-hidden="true"><Shape className={styles.editorHeadingShort} /><div className={styles.paragraph}><Shape /><Shape className={styles.paragraphShort} /></div></div>
    </LoadingRegion>
  )
}