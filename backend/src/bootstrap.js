const User = require('./models/User');
const Post = require('./models/Post');
const { Topic } = require('./models/Other');

const DEFAULT_TOPICS = [
  { name: 'Technology', slug: 'technology', color: '#7c5ce5', description: 'The latest in tech, software, and engineering' },
  { name: 'Programming', slug: 'programming', color: '#0a7c6a', description: 'Code, algorithms, and software craft' },
  { name: 'Design', slug: 'design', color: '#c84b0f', description: 'UI, UX, and product thinking' },
  { name: 'Science', slug: 'science', color: '#185fa5', description: 'Research, discovery, and curiosity' },
  { name: 'Writing', slug: 'writing', color: '#a07830', description: 'Craft, storytelling, and clear communication' },
  { name: 'AI & Machine Learning', slug: 'ai-ml', color: '#853fbd', description: 'Artificial intelligence and its implications' }
];

async function ensureBaseData() {
  if ((await Topic.countDocuments()) === 0) {
    await Topic.bulkWrite(
      DEFAULT_TOPICS.map(t => ({
        updateOne: {
          filter: { slug: t.slug },
          update: {
            $setOnInsert: {
              ...t,
              followerCount: 0,
              postCount: 0
            }
          },
          upsert: true
        }
      }))
    );
    console.log(`Bootstrapped default topics`);
  }

  const publishedPostCount = await Post.countDocuments({ status: 'published' });
  if (publishedPostCount > 0) return;

  let demoUser = await User.findOne({ username: 'inkwell' });
  if (!demoUser) {
    try {
      demoUser = await User.create({
        username: 'inkwell',
        email: 'demo@inkwell.io',
        passwordHash: 'demo1234',
        displayName: 'Inkwell Demo',
        bio: 'The official Inkwell demo account.'
      });
      console.log('Bootstrapped demo user: demo@inkwell.io / demo1234');
    } catch {
      demoUser = await User.findOne({ username: 'inkwell' });
    }
  }

  const programmingTopic = await Topic.findOne({ slug: 'programming' });
  const demoPost = await Post.create({
    authorId: demoUser._id,
    title: 'Welcome to Inkwell',
    slug: `welcome-to-inkwell-${Date.now().toString(36)}`,
    status: 'published',
    publishedAt: new Date(),
    topics: programmingTopic ? [programmingTopic._id] : [],
    tags: ['welcome', 'platform'],
    blocks: [
      { id: 'intro-1', type: 'heading', level: 2, content: 'Your platform is ready' },
      { id: 'intro-2', type: 'paragraph', content: 'This is a starter post to verify your full stack is connected and rendering correctly.' }
    ],
    aiMeta: {
      shortSummary: 'Your Inkwell setup is working and ready for publishing.',
      detailedSummary: 'This starter post confirms frontend and backend connectivity and gives you a baseline post to test the reading flow.',
      examBullets: ['Backend connected', 'Topics loaded', 'Post rendering enabled'],
      keyTakeaway: 'Inkwell is now ready to use.',
      status: 'done',
      generatedAt: new Date()
    }
  });

  if (programmingTopic) {
    programmingTopic.postCount = (programmingTopic.postCount || 0) + 1;
    await programmingTopic.save();
  }

  console.log(`Bootstrapped demo post: ${demoPost.slug}`);
}

module.exports = { ensureBaseData };
