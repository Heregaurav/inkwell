const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const Post = require('../models/Post');

router.get('/status', (req, res) => {
  res.json(aiService.aiStatus());
});

router.post('/suggest-titles', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const titles = await aiService.suggestTitles(content);
    res.json({ titles });
  } catch (err) {
    console.error('[ai/suggest-titles]', err);
    res.status(500).json({ error: 'Could not generate title suggestions' });
  }
});

router.post('/generate-tags', auth, async (req, res) => {
  try {
    const { title = '', content = '' } = req.body;
    if (typeof title !== 'string' || typeof content !== 'string' || !(title.trim() || content.trim())) {
      return res.status(400).json({ error: 'A title or content is required' });
    }
    const tags = await aiService.generateTags(title, content);
    res.json({ tags });
  } catch (err) {
    console.error('[ai/generate-tags]', err);
    res.status(500).json({ error: 'Could not generate tags' });
  }
});

// Public reading feature; only enrich context from posts that are public.
router.post('/eli5', async (req, res) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const simplified = await aiService.eli5(text.trim());
    res.json(simplified);
  } catch (err) {
    console.error('[ai/eli5]', err);
    res.status(500).json({ error: 'Could not explain the selected text' });
  }
});

async function findOwnedPost(postId, userId, res) {
  if (!mongoose.isValidObjectId(postId)) {
    res.status(400).json({ error: 'Invalid post id' });
    return null;
  }
  const post = await Post.findOne({ _id: postId, authorId: userId });
  if (!post) res.status(404).json({ error: 'Post not found' });
  return post;
}

router.post('/generate-summaries/:postId', auth, async (req, res) => {
  try {
    const post = await findOwnedPost(req.params.postId, req.user._id, res);
    if (!post) return;
    const generated = await aiService.generatePostMeta(post._id);
    if (!generated) return res.status(422).json({ error: 'Post content is too short or summary generation failed' });
    const refreshed = await Post.findById(post._id).select('aiMeta');
    res.json({ message: 'Summary generation complete', aiMeta: refreshed?.aiMeta });
  } catch (err) {
    console.error('[ai/generate-summaries]', err);
    res.status(500).json({ error: 'Could not queue summary generation' });
  }
});

router.post('/rank-comments/:postId', auth, async (req, res) => {
  try {
    if (!aiService.aiStatus().enabled) {
      return res.status(503).json({ error: 'Comment ranking requires GROQ_API_KEY' });
    }
    const post = await findOwnedPost(req.params.postId, req.user._id, res);
    if (!post) return;
    const ranked = await aiService.rankComments(post._id);
    if (!ranked) return res.status(502).json({ error: 'Groq did not return a usable comment ranking' });
    res.json({ message: 'Comment ranking complete' });
  } catch (err) {
    console.error('[ai/rank-comments]', err);
    res.status(500).json({ error: 'Could not queue comment ranking' });
  }
});

router.post('/writing-assist', auth, async (req, res) => {
  try {
    const { title = '', content = '' } = req.body;
    if (typeof title !== 'string' || typeof content !== 'string' || !(title.trim() || content.trim())) {
      return res.status(400).json({ error: 'A title or content is required' });
    }
    const assist = await aiService.generateWritingAssist(title, content);
    res.json({ assist });
  } catch (err) {
    console.error('[ai/writing-assist]', err);
    res.status(500).json({ error: 'Could not generate writing assistance' });
  }
});

router.post('/rewrite', auth, async (req, res) => {
  try {
    const { text, mode = 'clearer' } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const rewrite = await aiService.rewriteDraft(text, mode);
    res.json(rewrite);
  } catch (err) {
    console.error('[ai/rewrite]', err);
    res.status(500).json({ error: 'Could not rewrite the text' });
  }
});

module.exports = router;
