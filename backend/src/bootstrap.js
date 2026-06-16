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
  
}

module.exports = { ensureBaseData };