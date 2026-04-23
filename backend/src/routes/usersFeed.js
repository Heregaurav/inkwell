const express = require('express');
const userRouter = express.Router();
const feedRouter = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { auth, optionalAuth } = require('../middleware/auth');

// Users
userRouter.post('/bookmarks/:postId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bookmarked = user.bookmarks.some(id => id.equals(req.params.postId));
    if (bookmarked) user.bookmarks.pull(req.params.postId);
    else user.bookmarks.push(req.params.postId);
    await user.save();
    res.json({ bookmarked: !bookmarked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/me/bookmarks', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({ path: 'bookmarks', match: { status: 'published' }, populate: [{ path: 'authorId', select: 'username displayName avatar' }, { path: 'topics', select: 'name slug color' }] });
    res.json({ posts: user.bookmarks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.post('/:id/follow', auth, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ error: "Can't follow yourself" });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    const me = await User.findById(req.user._id);
    const following = me.followedAuthors.some(id => id.equals(req.params.id));
    if (following) { me.followedAuthors.pull(req.params.id); target.followers.pull(req.user._id); }
    else { me.followedAuthors.push(req.params.id); target.followers.push(req.user._id); }
    await Promise.all([me.save(), target.save()]);
    res.json({ following: !following });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-passwordHash -email').populate('followedTopics', 'name slug color');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isOwnProfile = req.user && req.user._id.equals(user._id);
    const postQuery = { authorId: user._id, status: isOwnProfile ? { $in: ['published', 'draft'] } : 'published' };
    const posts = await Post.find(postQuery)
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(50)
      .populate('authorId', 'username displayName avatar')
      .populate('topics', 'name slug color')
      .select('title slug authorId publishedAt updatedAt status stats aiMeta.shortSummary coverImage topics');
    res.json({ user, posts, isOwnProfile });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Feed
feedRouter.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user._id);
    const hasFollowSignals = (user.followedTopics?.length || 0) > 0 || (user.followedAuthors?.length || 0) > 0;
    const query = hasFollowSignals
      ? {
          status: 'published',
          $or: [
            { topics: { $in: user.followedTopics } },
            { authorId: { $in: user.followedAuthors } }
          ]
        }
      : { status: 'published' };

    let posts = await Post.find(query)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate('authorId', 'username displayName avatar')
      .populate('topics', 'name slug color icon')
      .select('title slug authorId topics tags stats publishedAt aiMeta.shortSummary aiMeta.keyTakeaway coverImage');

    if (hasFollowSignals && posts.length === 0) {
      posts = await Post.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('authorId', 'username displayName avatar')
        .populate('topics', 'name slug color icon')
        .select('title slug authorId topics tags stats publishedAt aiMeta.shortSummary aiMeta.keyTakeaway coverImage');
    }

    res.json({ posts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { userRouter, feedRouter };
