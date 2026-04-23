const OpenAI = require('openai');
const Post = require('../models/Post');
const { Comment } = require('../models/Other');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const hasAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'had',
  'has', 'have', 'he', 'her', 'his', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'of', 'on', 'or', 'our', 'she', 'that', 'the', 'their', 'them', 'they', 'this',
  'to', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why',
  'will', 'with', 'you', 'your'
]);

function blocksToText(blocks) {
  return (blocks || []).map(b => {
    if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'callout') return b.content || '';
    if (b.type === 'quiz') return b.quiz?.question || '';
    if (b.type === 'poll') return b.poll?.question || '';
    if (b.type === 'code') return `Code snippet (${b.code?.language}): ${b.code?.source?.slice(0, 200)}`;
    return '';
  }).filter(Boolean).join('\n\n');
}

function splitSentences(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function keywordCandidates(text) {
  return (text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [])
    .filter((word) => !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

function topKeywords(text, limit = 6) {
  const counts = new Map();
  for (const word of keywordCandidates(text)) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function summarizeText(text) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return {
      shortSummary: '',
      detailedSummary: '',
      examBullets: [],
      keyTakeaway: ''
    };
  }

  const shortSummary = sentences.slice(0, 2).join(' ');
  const detailedSummary = sentences.slice(0, 4).join(' ');
  const keywords = topKeywords(text, 5);

  return {
    shortSummary,
    detailedSummary,
    examBullets: [
      ...sentences.slice(0, 3).map((sentence) => sentence.replace(/[.!?]+$/, '')),
      ...keywords.map((keyword) => `Key topic: ${keyword}`)
    ].slice(0, 6),
    keyTakeaway: sentences[0]
  };
}

function fallbackTitlesFromContent(content) {
  const cleaned = (content || '').replace(/\s+/g, ' ').trim();
  const keywords = topKeywords(cleaned, 4);
  const lead = splitSentences(cleaned)[0] || '';
  const phrase = keywords.slice(0, 2).join(' and ') || 'this topic';
  const compactLead = lead.slice(0, 90).replace(/[.!?]+$/, '');

  return [
    { text: compactLead || `Understanding ${phrase}`, style: 'analytical', rationale: 'Uses the lead idea from the draft.' },
    { text: `What ${phrase} really means in practice`, style: 'how-to', rationale: 'Frames the post around practical value.' },
    { text: `The big idea behind ${phrase}`, style: 'narrative', rationale: 'Highlights the main theme clearly.' },
    { text: `A clearer way to think about ${phrase}`, style: 'question', rationale: 'Invites curiosity and clarity.' },
    { text: `Lessons from ${phrase}`, style: 'punchy', rationale: 'Short and reusable headline structure.' }
  ].filter((item, index, arr) => item.text && arr.findIndex((x) => x.text === item.text) === index).slice(0, 5);
}

function fallbackTagsFromContent(title, content) {
  const keywords = topKeywords(`${title} ${content}`, 8);
  return keywords.slice(0, 6).map((tag, index) => ({
    tag,
    confidence: Math.max(0.55, 0.9 - index * 0.08),
    type: index === 0 ? 'primary' : 'secondary'
  }));
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
      const fallback = summarizeText(content);
      post.aiMeta.shortSummary = fallback.shortSummary;
      post.aiMeta.detailedSummary = fallback.detailedSummary;
      post.aiMeta.examBullets = fallback.examBullets;
      post.aiMeta.keyTakeaway = fallback.keyTakeaway;
      post.aiMeta.suggestedTitles = fallbackTitlesFromContent(`${post.title}. ${content}`).map((item) => item.text);
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
  return fallbackTitlesFromContent(content);
};

exports.generateTags = async (title, content) => {
  const result = await callAI(
    `Extract topic tags from this blog post. Return JSON: { "tags": [{ "tag": "...", "confidence": 0.0-1.0, "type": "primary|secondary|related" }] }. Max 8 tags, each 1-3 words, lowercase.`,
    `Title: ${title}\n\nContent: ${content.slice(0, 1000)}`
  );
  if (result?.tags) return result.tags;
  return fallbackTagsFromContent(title, content);
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
