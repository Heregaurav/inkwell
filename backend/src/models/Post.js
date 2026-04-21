const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['paragraph','heading','image','code','quiz','poll','callout','divider'], required: true },
  content: String,
  level: Number, // for headings h1-h3
  quiz: {
    question: String,
    options: [String],
    correctIndex: Number,
    explanation: String,
    totalResponses: { type: Number, default: 0 },
    optionCounts: { type: [Number], default: [] }
  },
  poll: {
    question: String,
    options: [String],
    votes: { type: Map, of: Number, default: {} },
    totalVotes: { type: Number, default: 0 },
    votedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  code: {
    language: String,
    source: String,
    runnable: { type: Boolean, default: false }
  },
  callout: {
    style: { type: String, enum: ['info','warning','tip','danger'], default: 'info' },
    text: String
  }
}, { _id: false });

const postSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, unique: true, index: true },
  coverImage: String,
  blocks: [blockSchema],
  topics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic', index: true }],
  tags: [String],
  aiMeta: {
    shortSummary: String,
    detailedSummary: String,
    examBullets: [String],
    keyTakeaway: String,
    suggestedTitles: [String],
    generatedAt: Date,
    status: { type: String, enum: ['pending','done','failed'], default: 'pending' }
  },
  responseTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  responses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  status: { type: String, enum: ['draft','published','archived'], default: 'draft', index: true },
  stats: {
    views: { type: Number, default: 0 },
    readTime: { type: Number, default: 1 }, // minutes
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    engagementScore: { type: Number, default: 0 }
  },
  publishedAt: { type: Date, index: true }
}, { timestamps: true });

postSchema.index({ topics: 1, publishedAt: -1 });
postSchema.index({ authorId: 1, publishedAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ title: 'text', tags: 'text' });

// Compute reading time before save
postSchema.pre('save', function(next) {
  const text = this.blocks.map(b => b.content || b.quiz?.question || b.poll?.question || b.code?.source || '').join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  this.stats.readTime = Math.max(1, Math.ceil(words / 200));
  next();
});

module.exports = mongoose.model('Post', postSchema);
