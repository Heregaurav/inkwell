const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const Post = require('../models/Post');
const { Comment, QuizResponse } = require('../models/Other');
const { auth, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { v4: uuidv4 } = require ? require('crypto').randomUUID : () => Math.random().toString(36).slice(2);

function makeSlug(title) {
  return slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
}

// GET /api/v1/posts  — feed with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { topic, author, tag, search, page = 1, limit = 20, readerMode } = req.query;
    const query = { status: 'published' };
    if (topic) query.topics = topic;
    if (author) query.authorId = author;
    if (tag) query.tags = tag;
    if (search) query.$text = { $search: search };

    const posts = await Post.find(query)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * Math.min(limit, 50))
      .limit(Math.min(limit, 50))
      .populate('authorId', 'username displayName avatar')
      .populate('topics', 'name slug color icon')
      .select(readerMode === 'quick' ? 'title slug authorId topics tags stats publishedAt aiMeta.shortSummary aiMeta.keyTakeaway coverImage' : '-blocks.quiz.correctIndex');

    const total = await Post.countDocuments(query);
    res.json({ posts, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/posts/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { readerMode } = req.query;
    const post = await Post.findOne({ slug: req.params.slug, status: 'published' })
      .populate('authorId', 'username displayName avatar bio followedTopics followers')
      .populate('topics', 'name slug color icon description')
      .populate('responseTo', 'title slug authorId')
      .populate({ path: 'responses', select: 'title slug authorId publishedAt stats', populate: { path: 'authorId', select: 'username displayName avatar' } });

    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Increment views
    await Post.findByIdAndUpdate(post._id, { $inc: { 'stats.views': 1 } });

    let responseData = post.toObject();

    // Shape response by reader mode
    if (readerMode === 'quick') {
      responseData.blocks = null;
      responseData.readerContent = { mode: 'quick', content: post.aiMeta?.shortSummary || 'Summary not yet generated.', keyTakeaway: post.aiMeta?.keyTakeaway };
    } else if (readerMode === 'exam') {
      responseData.blocks = null;
      responseData.readerContent = { mode: 'exam', bullets: post.aiMeta?.examBullets || [], detailedSummary: post.aiMeta?.detailedSummary };
    } else {
      // Deep dive — remove correct answers from quiz for unanswered blocks
      if (responseData.blocks) {
        responseData.blocks = responseData.blocks.map(b => {
          if (b.type === 'quiz') { const safe = {...b}; delete safe.quiz?.correctIndex; return safe; }
          return b;
        });
      }
    }

    // Add isLiked if authenticated
    if (req.user) {
      responseData.isLiked = post.stats.likedBy?.includes(req.user._id);
      responseData.isBookmarked = req.user.bookmarks?.includes(post._id);
    }

    res.json({ post: responseData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/posts
router.post('/', auth, async (req, res) => {
  try {
    const { title, blocks, topics, tags, status, responseTo, coverImage } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const slug = makeSlug(title);
    const post = await Post.create({
      authorId: req.user._id,
      title, slug, blocks: blocks || [], topics: topics || [],
      tags: tags || [], status: status || 'draft',
      responseTo: responseTo || null, coverImage,
      publishedAt: status === 'published' ? new Date() : null
    });

    // If published, trigger AI metadata generation
    if (status === 'published') {
      aiService.generatePostMeta(post._id).catch(console.error);
      // If it's a response, link back
      if (responseTo) {
        await Post.findByIdAndUpdate(responseTo, { $addToSet: { responses: post._id } });
      }
    }

    await post.populate('authorId', 'username displayName avatar');
    res.status(201).json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/posts/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, authorId: req.user._id });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { title, blocks, topics, tags, status, coverImage } = req.body;
    const wasPublished = post.status === 'published';

    if (title) post.title = title;
    if (blocks) post.blocks = blocks;
    if (topics) post.topics = topics;
    if (tags) post.tags = tags;
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (status) {
      if (status === 'published' && !wasPublished) post.publishedAt = new Date();
      post.status = status;
    }

    await post.save();

    if (post.status === 'published') aiService.generatePostMeta(post._id).catch(console.error);

    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/posts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, authorId: req.user._id },
      { status: 'archived' }, { new: true }
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/posts/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const liked = post.stats.likedBy?.includes(req.user._id);
    if (liked) {
      post.stats.likedBy.pull(req.user._id);
      post.stats.likes = Math.max(0, post.stats.likes - 1);
    } else {
      post.stats.likedBy.push(req.user._id);
      post.stats.likes++;
    }
    await post.save();
    res.json({ liked: !liked, likes: post.stats.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/posts/:id/blocks/:blockId/poll-vote
router.post('/:id/blocks/:blockId/poll-vote', auth, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const block = post.blocks.find(b => b.id === req.params.blockId);
    if (!block || block.type !== 'poll') return res.status(404).json({ error: 'Poll block not found' });

    if (block.poll.votedUsers?.includes(req.user._id)) {
      return res.status(409).json({ error: 'Already voted' });
    }

    const key = String(optionIndex);
    block.poll.votes.set(key, (block.poll.votes.get(key) || 0) + 1);
    block.poll.totalVotes = (block.poll.totalVotes || 0) + 1;
    block.poll.votedUsers.push(req.user._id);
    await post.save();

    const votesObj = Object.fromEntries(block.poll.votes);
    req.io?.to(`post:${req.params.id}`).emit('poll-update', { blockId: req.params.blockId, votes: votesObj, totalVotes: block.poll.totalVotes });

    res.json({ votes: votesObj, totalVotes: block.poll.totalVotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/posts/:id/blocks/:blockId/quiz-answer
router.post('/:id/blocks/:blockId/quiz-answer', auth, async (req, res) => {
  try {
    const { selectedIndex } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const block = post.blocks.find(b => b.id === req.params.blockId);
    if (!block || block.type !== 'quiz') return res.status(404).json({ error: 'Quiz block not found' });

    const existing = await QuizResponse.findOne({ postId: req.params.id, blockId: req.params.blockId, userId: req.user._id });
    if (existing) return res.status(409).json({ error: 'Already answered', isCorrect: existing.isCorrect, correctIndex: block.quiz.correctIndex, explanation: block.quiz.explanation });

    const isCorrect = selectedIndex === block.quiz.correctIndex;
    await QuizResponse.create({ postId: req.params.id, blockId: req.params.blockId, userId: req.user._id, selectedIndex, isCorrect });

    // Update aggregate counts
    if (!block.quiz.optionCounts || block.quiz.optionCounts.length === 0) {
      block.quiz.optionCounts = new Array(block.quiz.options.length).fill(0);
    }
    block.quiz.optionCounts[selectedIndex] = (block.quiz.optionCounts[selectedIndex] || 0) + 1;
    block.quiz.totalResponses = (block.quiz.totalResponses || 0) + 1;
    await post.save();

    res.json({ isCorrect, correctIndex: block.quiz.correctIndex, explanation: block.quiz.explanation, optionCounts: block.quiz.optionCounts, totalResponses: block.quiz.totalResponses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/posts/:id/responses
router.get('/:id/responses', async (req, res) => {
  try {
    const posts = await Post.find({ responseTo: req.params.id, status: 'published' })
      .populate('authorId', 'username displayName avatar')
      .select('title slug authorId publishedAt stats aiMeta.shortSummary')
      .sort({ publishedAt: -1 });
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
