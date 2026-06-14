const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Topic = require('../models/Other').Topic;
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ posts: [], topics: [], users: [] });

    const limit = Math.min(40, Math.max(8, parseInt(req.query.limit, 10) || 20));
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [topics, users] = await Promise.all([
      Topic.find({
        $or: [
          { name: regex },
          { description: regex },
          { slug: regex }
        ]
      }).sort({ followerCount: -1 }).limit(limit),
      User.find({
        $or: [
          { username: regex },
          { displayName: regex },
          { bio: regex }
        ]
      }).select('username displayName avatar bio').limit(limit)
    ]);

    const postQuery = { status: 'published' };
    if (req.user) {
      postQuery.$or = [
        { visibility: 'public' },
        { visibility: 'private', authorId: req.user._id }
      ];
    } else {
      postQuery.visibility = 'public';
    }

    const orClauses = [
      { title: regex },
      { tags: regex }
    ];

    if (users.length) orClauses.push({ authorId: { $in: users.map(u => u._id) } });
    if (topics.length) orClauses.push({ topics: { $in: topics.map(t => t._id) } });

    postQuery.$and = [
      { $or: orClauses },
      req.user ? { $or: postQuery.$or } : { visibility: 'public' }
    ];
    delete postQuery.$or;

    const posts = await Post.find(postQuery)
      .sort({ publishedAt: -1 })
      .limit(limit)
      .populate('authorId', 'username displayName avatar')
      .populate('topics', 'name slug color icon')
      .select('title slug authorId topics tags stats publishedAt aiMeta.shortSummary coverImage');

    res.json({ posts, topics, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
