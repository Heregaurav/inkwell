const express = require('express');
const router = express.Router();
const { Topic } = require('../models/Other');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { name: new RegExp(search, 'i') } : {};
    const topics = await Topic.find(query).sort({ followerCount: -1 });
    res.json({ topics });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, color, icon, parentTopic } = req.body;
    const slugify = require('slugify');
    const slug = slugify(name, { lower: true, strict: true });
    const topic = await Topic.create({ name, slug, description, color, icon, parentTopic });
    res.status(201).json({ topic });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/follow', auth, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    const user = await User.findById(req.user._id);
    const following = user.followedTopics.includes(req.params.id);
    if (following) {
      user.followedTopics.pull(req.params.id);
      topic.followerCount = Math.max(0, topic.followerCount - 1);
    } else {
      user.followedTopics.push(req.params.id);
      topic.followerCount++;
    }
    await Promise.all([user.save(), topic.save()]);
    res.json({ following: !following, followerCount: topic.followerCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
