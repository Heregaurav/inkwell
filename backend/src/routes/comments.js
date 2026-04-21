// comments.js
const express = require('express');
const router = express.Router();
const { Comment } = require('../models/Other');
const { auth, optionalAuth } = require('../middleware/auth');

router.get('/post/:postId', optionalAuth, async (req, res) => {
  try {
    const { parentId } = req.query;
    const query = { postId: req.params.postId, parentId: parentId || null };
    const comments = await Comment.find(query)
      .populate('authorId', 'username displayName avatar')
      .sort({ isTopComment: -1, createdAt: -1 });
    const withMeta = comments.map(c => {
      const obj = c.toObject();
      if (req.user) obj.isLiked = c.likedBy?.some(id => id.equals(req.user._id));
      return obj;
    });
    res.json({ comments: withMeta });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/post/:postId', auth, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
    const comment = await Comment.create({ postId: req.params.postId, authorId: req.user._id, content, parentId: parentId || null });
    await comment.populate('authorId', 'username displayName avatar');
    res.status(201).json({ comment });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Not found' });
    const liked = comment.likedBy?.includes(req.user._id);
    if (liked) { comment.likedBy.pull(req.user._id); comment.likes = Math.max(0, comment.likes - 1); }
    else { comment.likedBy.push(req.user._id); comment.likes++; }
    await comment.save();
    res.json({ liked: !liked, likes: comment.likes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, authorId: req.user._id });
    if (!comment) return res.status(404).json({ error: 'Not found' });
    await comment.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
