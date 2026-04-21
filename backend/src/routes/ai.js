const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');

router.get('/status', (req, res) => {
  res.json(aiService.aiStatus());
});

router.post('/suggest-titles', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const titles = await aiService.suggestTitles(content);
    res.json({ titles });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/generate-tags', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const tags = await aiService.generateTags(title || '', content || '');
    res.json({ tags });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/eli5', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    const simplified = await aiService.eli5(text);
    res.json({ simplified });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/generate-summaries/:postId', auth, async (req, res) => {
  try {
    aiService.generatePostMeta(req.params.postId).catch(console.error);
    res.json({ message: 'AI generation queued' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rank-comments/:postId', auth, async (req, res) => {
  try {
    aiService.rankComments(req.params.postId).catch(console.error);
    res.json({ message: 'Comment ranking queued' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
