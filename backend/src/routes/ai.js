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
    const { text, context = {} } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    // If a postId is provided, fetch the post and enrich the context
    let enrichedContext = { ...context };
    if (context.postId) {
      const post = await Post.findById(context.postId);
      if (post) {
        // Convert blocks to plain text
        const fullContent = blocksToText(post.blocks);
        // Get a summary if available, else generate one
        let postSummary = post.aiMeta?.shortSummary;
        if (!postSummary) {
          const summary = summarizeText(fullContent);
          postSummary = summary.shortSummary || summary.detailedSummary;
        }
        enrichedContext.fullContent = fullContent;
        enrichedContext.postSummary = postSummary;
        // Also pass title if not already present
        if (!enrichedContext.title) enrichedContext.title = post.title;
      } else {
        console.warn('[eli5 route] Post not found for id:', context.postId);
      }
    }

    const simplified = await aiService.eli5(text, enrichedContext);
    res.json(simplified);
  } catch (err) {
    console.error('[eli5 route] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
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

router.post('/writing-assist', auth, async (req, res) => {
  try {
    const { title = '', content = '' } = req.body;
    const assist = await aiService.generateWritingAssist(title, content);
    res.json({ assist });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rewrite', auth, async (req, res) => {
  try {
    const { text = '', mode = 'clearer' } = req.body;
    if (!text.trim()) return res.status(400).json({ error: 'Text required' });
    const rewrite = await aiService.rewriteDraft(text, mode);
    res.json(rewrite);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
