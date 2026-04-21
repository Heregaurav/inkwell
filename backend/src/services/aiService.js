const OpenAI = require('openai');
const Post = require('../models/Post');
const { Comment } = require('../models/Other');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const hasAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

function blocksToText(blocks) {
  return (blocks || []).map(b => {
    if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'callout') return b.content || '';
    if (b.type === 'quiz') return b.quiz?.question || '';
    if (b.type === 'poll') return b.poll?.question || '';
    if (b.type === 'code') return `Code snippet (${b.code?.language}): ${b.code?.source?.slice(0, 200)}`;
    return '';
  }).filter(Boolean).join('\n\n');
}

async function callAI(systemPrompt, userContent, jsonMode = true) {
  if (!openai) {
    // Return mock data when no API key
    return null;
  }
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      max_tokens: 1000
    });
    const text = response.choices[0].message.content;
    if (jsonMode) {
      try { return JSON.parse(text); } catch { return null; }
    }
    return text;
  } catch (err) {
    // Do not break core product flows when AI provider is down or key is invalid.
    console.warn('AI call fallback:', err?.status || '', err?.message || 'unknown error');
    return null;
  }
}

exports.aiStatus = () => ({ enabled: hasAI });

exports.generatePostMeta = async (postId) => {
  const post = await Post.findById(postId);
  if (!post) return;

  const content = blocksToText(post.blocks);
  if (!content || content.length < 50) return;

  try {
    post.aiMeta.status = 'pending';
    await post.save();

    const result = await callAI(
      `You are a reading assistant. Given a blog post, produce valid JSON with exactly these keys:
      - shortSummary: 2-3 sentence summary (string)
      - detailedSummary: 150-200 word summary (string)
      - examBullets: array of 5-10 revision bullet points (array of strings)
      - keyTakeaway: single most important sentence (string)
      - suggestedTitles: array of 3 alternative title suggestions (array of strings)
      Return ONLY valid JSON, no markdown.`,
      `Title: ${post.title}\n\nContent:\n${content.slice(0, 3000)}`
    );

    if (result) {
      post.aiMeta.shortSummary = result.shortSummary || '';
      post.aiMeta.detailedSummary = result.detailedSummary || '';
      post.aiMeta.examBullets = result.examBullets || [];
      post.aiMeta.keyTakeaway = result.keyTakeaway || '';
      post.aiMeta.suggestedTitles = result.suggestedTitles || [];
    } else {
      // Fallback mock summaries when no AI
      post.aiMeta.shortSummary = `${post.title} — A comprehensive exploration of the topic covering key concepts and practical insights.`;
      post.aiMeta.detailedSummary = `This post titled "${post.title}" provides an in-depth look at the subject matter. The author walks through the core concepts, shares practical examples, and offers actionable advice. Readers will gain a solid understanding of the topic by the end.`;
      post.aiMeta.examBullets = ['Key concept introduced in the post', 'Main argument or thesis', 'Supporting evidence presented', 'Practical application discussed', 'Conclusion and next steps'];
      post.aiMeta.keyTakeaway = `The most important insight from "${post.title}" is its practical approach to the subject.`;
    }

    post.aiMeta.generatedAt = new Date();
    post.aiMeta.status = 'done';
    await post.save();
  } catch (err) {
    post.aiMeta.status = 'failed';
    await post.save();
    console.error('AI meta generation failed:', err.message);
  }
};

exports.suggestTitles = async (content) => {
  const result = await callAI(
    `You are a headline writer for an editorial platform. Generate 5 title options.
    Return JSON: { "titles": [{ "text": "...", "style": "punchy|analytical|question|how-to|narrative", "rationale": "..." }] }`,
    content.slice(0, 1500)
  );
  if (result?.titles) return result.titles;
  // Fallback
  return [
    { text: 'A Fresh Perspective on the Topic', style: 'analytical', rationale: 'Clear and direct' },
    { text: 'What You Need to Know', style: 'how-to', rationale: 'Practical framing' },
    { text: 'The Complete Guide', style: 'punchy', rationale: 'Authoritative' }
  ];
};

exports.generateTags = async (title, content) => {
  const result = await callAI(
    `Extract topic tags from this blog post. Return JSON: { "tags": [{ "tag": "...", "confidence": 0.0-1.0, "type": "primary|secondary|related" }] }. Max 8 tags, each 1-3 words, lowercase.`,
    `Title: ${title}\n\nContent: ${content.slice(0, 1000)}`
  );
  if (result?.tags) return result.tags;
  return [{ tag: 'general', confidence: 0.8, type: 'primary' }];
};

exports.eli5 = async (text) => {
  const result = await callAI(
    `Simplify the following text so a curious 12-year-old can understand it. Avoid jargon, use analogies, keep under 80 words, preserve the meaning. Return JSON: { "simplified": "..." }`,
    text
  );
  if (result?.simplified) return result.simplified;
  return `Here's a simpler way to think about it: ${text.slice(0, 100)}... (Think of it like something you'd encounter in everyday life, just with a fancy technical name!)`;
};

exports.rankComments = async (postId) => {
  const post = await Post.findById(postId).select('title');
  const comments = await Comment.find({ postId }).populate('authorId', 'username').limit(50);
  if (!comments.length) return;

  const result = await callAI(
    `Rank these blog comments by quality. Score each 1-10 on insight, relevance, respectfulness, uniqueness. Return JSON: { "ranked": [{ "commentId": "...", "score": 0, "reason": "..." }] }`,
    `Post: ${post.title}\n\nComments:\n${JSON.stringify(comments.map(c => ({ id: c._id, content: c.content.slice(0, 200) })))}`
  );

  if (result?.ranked) {
    // Reset all
    await Comment.updateMany({ postId }, { isTopComment: false, topCommentScore: 0 });
    const top3 = result.ranked.sort((a, b) => b.score - a.score).slice(0, 3);
    for (const item of top3) {
      await Comment.findByIdAndUpdate(item.commentId, { isTopComment: true, topCommentScore: item.score });
    }
  }
};
