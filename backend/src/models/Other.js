const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  content: { type: String, required: true, maxlength: 2000 },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isTopComment: { type: Boolean, default: false },
  topCommentScore: { type: Number, default: 0 }
}, { timestamps: true });

commentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });

const topicSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, required: true },
  description: String,
  icon: String,
  color: { type: String, default: '#7c5ce5' },
  parentTopic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  followerCount: { type: Number, default: 0 },
  postCount: { type: Number, default: 0 }
}, { timestamps: true });

const quizResponseSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  blockId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  selectedIndex: { type: Number, required: true },
  isCorrect: Boolean,
  answeredAt: { type: Date, default: Date.now }
});

quizResponseSchema.index({ postId: 1, blockId: 1, userId: 1 }, { unique: true });

module.exports = {
  Comment: mongoose.model('Comment', commentSchema),
  Topic: mongoose.model('Topic', topicSchema),
  QuizResponse: mongoose.model('QuizResponse', quizResponseSchema)
};
