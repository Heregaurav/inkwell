// backend/src/seed.js — Run with: node src/seed.js
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Post = require('./models/Post')
const { Topic } = require('./models/Other')

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inkwell_db'

const TOPICS = [
  { name: 'Technology', slug: 'technology', color: '#7c5ce5', description: 'The latest in tech, software, and engineering', postCount: 0, followerCount: 0 },
  { name: 'Programming', slug: 'programming', color: '#0a7c6a', description: 'Code, algorithms, and software craft', postCount: 0, followerCount: 0 },
  { name: 'Design', slug: 'design', color: '#c84b0f', description: 'UI, UX, and the art of making things', postCount: 0, followerCount: 0 },
  { name: 'Science', slug: 'science', color: '#185fa5', description: 'Research, discovery, and curiosity', postCount: 0, followerCount: 0 },
  { name: 'Writing', slug: 'writing', color: '#a07830', description: 'Craft, storytelling, and the written word', postCount: 0, followerCount: 0 },
  { name: 'AI & Machine Learning', slug: 'ai-ml', color: '#853fbd', description: 'Artificial intelligence and its implications', postCount: 0, followerCount: 0 },
  { name: 'Productivity', slug: 'productivity', color: '#2a7a2a', description: 'Systems, tools, and focus', postCount: 0, followerCount: 0 },
  { name: 'Philosophy', slug: 'philosophy', color: '#5f4e38', description: 'Ideas, ethics, and deep questions', postCount: 0, followerCount: 0 },
]

const DEMO_POSTS = [
  {
    title: 'Why React Server Components Will Change Everything',
    blocks: [
      { id: 'b1', type: 'paragraph', content: 'React Server Components represent a fundamental shift in how we think about building web applications. For years, the React mental model has been entirely client-centric — components live in the browser, fetch their own data, and manage their own state.' },
      { id: 'b2', type: 'heading', level: 2, content: 'The Problem With Client-Side Data Fetching' },
      { id: 'b3', type: 'paragraph', content: 'Consider a typical React application. The browser loads a JavaScript bundle, React initializes, components mount, and then — finally — data fetching begins. This waterfall of work means your users are staring at loading spinners while data they need is sitting idle on your server.' },
      { id: 'b4', type: 'callout', callout: { style: 'tip', text: 'Server Components run only on the server and are never shipped to the browser — making your bundle dramatically smaller.' }, content: '' },
      { id: 'b5', type: 'code', code: { language: 'javascript', source: `// Before: client-side fetching\nfunction BlogPost({ id }) {\n  const [post, setPost] = useState(null)\n  useEffect(() => {\n    fetch(\`/api/posts/\${id}\`).then(r => r.json()).then(setPost)\n  }, [id])\n  if (!post) return <Spinner />\n  return <Article post={post} />\n}\n\n// After: Server Component\nasync function BlogPost({ id }) {\n  const post = await db.posts.findById(id) // runs on server!\n  return <Article post={post} />\n}`, runnable: false } },
      { id: 'b6', type: 'quiz', quiz: { question: 'What is the primary benefit of React Server Components?', options: ['They enable automatic code splitting', 'They eliminate client-side data fetching waterfalls', 'They replace Redux for state management', 'They make CSS easier to write'], correctIndex: 1, explanation: 'RSCs fetch data on the server before rendering, eliminating the need for client-side data waterfalls and reducing bundle size.' } },
      { id: 'b7', type: 'poll', poll: { question: 'Are you using React Server Components in production?', options: ['Yes, fully migrated', 'Partially, testing them out', 'Not yet, but planning to', 'No, sticking with client components'], votes: { '0': 12, '1': 34, '2': 28, '3': 8 }, totalVotes: 82, votedUsers: [] } },
    ],
    tags: ['react', 'javascript', 'web development', 'frontend'],
    topicSlug: 'programming',
    aiMeta: {
      shortSummary: 'React Server Components shift data fetching to the server, eliminating client-side waterfalls and dramatically reducing JavaScript bundle sizes.',
      detailedSummary: 'This post explores how React Server Components fundamentally change the React mental model by moving data fetching to the server. The author explains the traditional client-side waterfall problem, demonstrates the difference with code examples, and shows how RSCs result in smaller bundles and better performance. Key concepts include the distinction between server and client components and when to use each.',
      examBullets: ['RSCs run only on the server — never shipped to the browser', 'Data fetching happens at render time, not after mount', 'Bundle size decreases because server component code is excluded', 'Async/await works directly in component functions', 'Client components are still needed for interactivity'],
      keyTakeaway: 'React Server Components move data fetching to the server, ending the era of client-side loading spinners for initial data.',
      status: 'done',
      generatedAt: new Date()
    }
  }
]

async function seed() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('Connected to MongoDB')

    // Clear existing data
    await Promise.all([User.deleteMany({}), Post.deleteMany({}), Topic.deleteMany({})])
    console.log('Cleared existing data')

    // Create topics
    const topics = await Topic.insertMany(TOPICS)
    console.log(`Created ${topics.length} topics`)

    // Create demo user
    const user = await User.create({
      username: 'inkwell',
      email: 'demo@inkwell.io',
      passwordHash: 'demo1234',
      displayName: 'Inkwell Demo',
      bio: 'The official Inkwell demo account. Explore the platform features.',
      followedTopics: topics.slice(0, 3).map(t => t._id)
    })
    console.log(`Created demo user: demo@inkwell.io / demo1234`)

    // Create demo post
    for (const postData of DEMO_POSTS) {
      const topic = topics.find(t => t.slug === postData.topicSlug)
      await Post.create({
        authorId: user._id,
        title: postData.title,
        slug: postData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-demo',
        blocks: postData.blocks,
        topics: topic ? [topic._id] : [],
        tags: postData.tags,
        aiMeta: postData.aiMeta,
        status: 'published',
        publishedAt: new Date()
      })
    }
    console.log(`Created ${DEMO_POSTS.length} demo post(s)`)

    console.log('\n✦ Seed complete! Login with: demo@inkwell.io / demo1234')
    process.exit(0)
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
  }
}

seed()
