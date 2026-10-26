// Groq exposes an OpenAI-compatible chat completions API. Keep the SDK, but
// point it at Groq so only GROQ_API_KEY is used for hosted model calls.
const OpenAI = require('openai');
const Post = require('../models/Post');
const { Comment } = require('../models/Other');

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const groqApiKey = process.env.GROQ_API_KEY?.trim();
const groq = groqApiKey ? new OpenAI({
  apiKey: groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1'
}) : null;
const hasAI = Boolean(groqApiKey);
const postMetaTasks = new Map();

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'had',
  'has', 'have', 'he', 'her', 'his', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'of', 'on', 'or', 'our', 'she', 'that', 'the', 'their', 'them', 'they', 'this',
  'to', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why',
  'will', 'with', 'you', 'your'
]);

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function truncate(text, maxLength = 140) {
  const cleaned = normalizeText(text);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).replace(/[\s,;:-]+$/, '')}...`;
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function firstSentence(text) {
  return splitSentences(text)[0] || '';
}

function keywordCandidates(text) {
  return normalizeText(text).toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
}

function keywordPhrases(text) {
  const words = keywordCandidates(text).filter((word) => !STOP_WORDS.has(word) && !/^\d+$/.test(word));
  const phrases = [];
  for (let i = 0; i < words.length - 1; i += 1) {
    if (words[i] === words[i + 1]) continue;
    const pair = `${words[i]} ${words[i + 1]}`;
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) phrases.push(pair);
    if (i < words.length - 2) {
      const triple = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1]) && !STOP_WORDS.has(words[i + 2])) {
        phrases.push(triple);
      }
    }
  }
  return phrases;
}

function topKeywords(text, limit = 6) {
  const counts = new Map();
  for (const word of keywordCandidates(text)) {
    if (STOP_WORDS.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function likelyJargon(text, limit = 8) {
  const counts = new Map();
  for (const word of keywordCandidates(text)) {
    if (STOP_WORDS.has(word) || /^\d+$/.test(word) || word.length < 6) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.keys()].slice(0, limit);
}

function uniqueStrings(values, limit = Infinity) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const text = normalizeText(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function blocksToText(blocks) {
  return (blocks || [])
    .map((b) => {
      if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'callout') return b.content || '';
      if (b.type === 'quiz') return b.quiz?.question || '';
      if (b.type === 'poll') return b.poll?.question || '';
      if (b.type === 'code') return `Code snippet (${b.code?.language || 'code'}): ${b.code?.source?.slice(0, 300) || ''}`;
      return '';
    })
    .filter(Boolean)
    .join('\n\n');
}

function buildDraftSnapshot(title, content) {
  const combined = normalizeText(`${title || ''} ${content || ''}`);
  const sentences = splitSentences(combined);
  const keywords = topKeywords(combined, 8);
  const phrases = keywordPhrases(combined).slice(0, 10);
  const wordCount = combined ? combined.split(/\s+/).filter(Boolean).length : 0;
  const hasQuestions = /\?/.test(combined);
  const hasFirstPerson = /\b(i|we|our|my|mine|us)\b/i.test(combined);
  return {
    title: normalizeText(title),
    content: normalizeText(content),
    combined,
    sentences,
    keywords,
    phrases,
    wordCount,
    hasQuestions,
    hasFirstPerson,
    leadSentence: sentences[0] || '',
    leadParagraph: sentences.slice(0, 2).join(' ')
  };
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

  const keywords = topKeywords(text, 6);
  const keyTakeaway = firstSentence(text) || truncate(text, 120);
  const shortSummary = sentences.slice(0, Math.min(2, sentences.length)).join(' ');
  const detailedSummary = sentences.slice(0, Math.min(5, sentences.length)).join(' ');
  const bulletSentences = sentences.slice(0, 4).map((sentence) => sentence.replace(/[.!?]+$/, ''));
  const keywordBullets = keywords.map((keyword) => `Key topic: ${keyword}`);

  return {
    shortSummary,
    detailedSummary,
    examBullets: uniqueStrings([...bulletSentences, ...keywordBullets], 8),
    keyTakeaway
  };
}

function fallbackTitlesFromContent(content) {
  const snapshot = buildDraftSnapshot('', content);
  const lead = truncate(snapshot.leadSentence, 95);
  const phrase = snapshot.phrases[0] || snapshot.keywords.slice(0, 2).join(' and ') || 'this topic';
  const subject = snapshot.keywords[0] || phrase;

  const titles = [
    { text: lead || `Understanding ${phrase}`, style: 'analytical', rationale: 'Uses the draft lead idea directly.' },
    { text: `What ${phrase} means in practice`, style: 'how-to', rationale: 'Focuses on the practical takeaway.' },
    { text: `Why ${subject} matters now`, style: 'question', rationale: 'Frames the post as a current insight.' },
    { text: `A clearer way to think about ${phrase}`, style: 'narrative', rationale: 'Sounds more natural and conversational.' },
    { text: `${truncate(subject, 40)}: the core idea`, style: 'punchy', rationale: 'Short, direct, and easy to scan.' }
  ];

  return uniqueStrings(titles.map((item) => item.text)).map((text) => {
    const match = titles.find((item) => item.text === text);
    return match || { text, style: 'analytical', rationale: 'Fallback title.' };
  });
}

function fallbackTagsFromContent(title, content) {
  const snapshot = buildDraftSnapshot(title, content);
  const phraseTags = uniqueStrings(snapshot.phrases, 8);
  const keywordTags = uniqueStrings(snapshot.keywords, 8);
  const candidates = [...phraseTags, ...keywordTags];
  return candidates.slice(0, 6).map((tag, index) => ({
    tag,
    confidence: Math.max(0.55, 0.92 - index * 0.08),
    type: index === 0 ? 'primary' : index < 3 ? 'secondary' : 'related'
  }));
}

function normalizeTitleSuggestions(result) {
  const titles = Array.isArray(result?.titles) ? result.titles : [];
  const normalized = titles.map((item, index) => {
    if (typeof item === 'string') {
      return { text: normalizeText(item), style: index === 0 ? 'analytical' : 'punchy', rationale: 'AI suggested title.' };
    }
    return {
      text: normalizeText(item?.text),
      style: ['punchy', 'analytical', 'question', 'how-to', 'narrative'].includes(item?.style) ? item.style : 'analytical',
      rationale: normalizeText(item?.rationale) || 'AI suggested title.'
    };
  }).filter((item) => item.text);

  return uniqueStrings(normalized.map((item) => item.text)).map((text) => {
    const found = normalized.find((item) => item.text === text);
    return found || { text, style: 'analytical', rationale: 'AI suggested title.' };
  }).slice(0, 5);
}

function normalizeTagSuggestions(result, title, content) {
  const rawTags = Array.isArray(result?.tags) ? result.tags : [];
  const normalized = rawTags.map((item, index) => {
    const tagText = typeof item === 'string' ? item : item?.tag;
    return {
      tag: normalizeText(tagText).toLowerCase().replace(/\s+/g, ' '),
      confidence: Number.isFinite(item?.confidence) ? Math.max(0, Math.min(1, item.confidence)) : Math.max(0.55, 0.9 - index * 0.08),
      type: ['primary', 'secondary', 'related'].includes(item?.type) ? item.type : (index === 0 ? 'primary' : index < 3 ? 'secondary' : 'related')
    };
  }).filter((item) => item.tag);

  const deduped = [];
  const seen = new Set();
  for (const item of normalized) {
    const key = item.tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  if (deduped.length > 0) return deduped.slice(0, 8);
  return fallbackTagsFromContent(title, content);
}

function normalizeWritingAssist(result, snapshot) {
  const safeArray = (value) => uniqueStrings(Array.isArray(value) ? value : [], 8);
  return {
    overview: normalizeText(result?.overview) || truncate(snapshot.leadParagraph || snapshot.combined, 220),
    audience: normalizeText(result?.audience) || 'Readers who want a clearer, more useful version of the draft.',
    tone: normalizeText(result?.tone) || (snapshot.hasFirstPerson ? 'conversational' : 'clear and direct'),
    strengths: safeArray(result?.strengths),
    frictionPoints: safeArray(result?.frictionPoints),
    suggestedStructure: safeArray(result?.suggestedStructure),
    nextEdits: safeArray(result?.nextEdits),
    openingHook: normalizeText(result?.openingHook) || truncate(snapshot.leadSentence || snapshot.combined, 140),
    titleAngles: safeArray(result?.titleAngles),
    tagIdeas: safeArray(result?.tagIdeas),
    rewritePrompt: normalizeText(result?.rewritePrompt) || 'Tighten the introduction and make the main point easier to scan.'
  };
}

async function callAI({ systemPrompt, userContent, jsonMode = true, temperature = 0.4, maxTokens = 1000, throwOnError = false }) {
  if (!groq) return null;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      ...(MODEL.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      temperature,
      max_tokens: maxTokens
    });

    const text = response.choices?.[0]?.message?.content || '';
    if (!jsonMode) return text;

    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI response must be a JSON object');
      return parsed;
    } catch (error) {
      if (throwOnError) {
        error.permanent = true;
        throw error;
      }
      return null;
    }
  } catch (err) {
    if (throwOnError) throw err;
    console.warn('AI call fallback:', err?.status || '', err?.message || 'unknown error');
    return null;
  }
}

exports.aiStatus = () => ({ enabled: hasAI, provider: 'groq', model: MODEL });

// ---------------------------------------------------------------------------
// ELI5 - improved with better fallback and more creative prompt
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ELI5 - enhanced fallback using full post content (if available)
// ---------------------------------------------------------------------------

function fallbackEli5(text) {
  // Stay extractive when the model is unavailable; never import claims from
  // the rest of the article or invent an explanation from unrelated context.
  const selectedSentences = splitSentences(text).slice(0, 2).join(' ');
  return truncate(selectedSentences || text, 280);
}

function limitExplanation(text) {
  const firstSentences = splitSentences(normalizeText(text)).slice(0, 2).join(' ');
  return firstSentences.split(/\s+/).slice(0, 45).join(' ');
}

exports.eli5 = async (text) => {
  if (!text || !text.trim()) {
    return 'Nothing selected – please highlight some text to explain.';
  }

  const selectedText = text.trim().slice(0, 1500);
  console.log(`[eli5] Request for selected text length ${selectedText.length}`);

  // If AI is available, try it
  if (hasAI) {
    const systemPrompt = `Give a simple explanation of the selected text for someone new to the topic. Translate its ideas into plain, everyday language instead of repeating the wording. Briefly define technical terms that appear in the selection when needed to explain it. Keep strictly to the selected idea: do not summarize the article or add unrelated facts, examples, advice, or assumptions. If the selection alone is too ambiguous to explain accurately, say so briefly. Use at most 2 short sentences and 45 words. No heading, bullets, or preamble.`;

    try {
      const result = await callAI({
        systemPrompt,
        userContent: `Selected text:\n${selectedText}`,
        jsonMode: false,
        temperature: 0.2,
        // GPT-OSS counts reasoning tokens against the completion budget.
        // The displayed answer is independently limited to two sentences/45 words.
        maxTokens: 512
      });

      if (result && result.trim()) {
        const concise = limitExplanation(result).replace(/^(["'“”])|(["'“”])$/g, '');
        console.log(`[eli5] AI returned explanation of length ${concise.length}`);
        return truncate(concise, 360);
      }
    } catch (err) {
      console.error('[eli5] AI call error:', err.message);
    }

    console.warn('[eli5] AI failed, falling back');
  }

  // If AI not available or failed, use fallback
  const fallback = fallbackEli5(selectedText);
  console.log(`[eli5] Fallback explanation length: ${fallback.length}, preview: "${fallback.slice(0, 100)}..."`);
  return fallback;
};
// ---------------------------------------------------------------------------
// Other AI functions - relaxed guidance
// ---------------------------------------------------------------------------

async function runPostMetaGeneration(postId, { queueJobKey, claimToken } = {}) {
  const post = await Post.findById(postId);
  if (!post) return false;
  if (queueJobKey && (post.status !== 'published' || post.aiMeta?.jobKey !== queueJobKey)) return false;

  const content = blocksToText(post.blocks);
  if (!content || content.length < 50) return false;

  const snapshot = buildDraftSnapshot(post.title, content);

  try {
    if (!queueJobKey) {
      post.aiMeta.status = 'pending';
      await post.save();
    }

    const result = await callAI({
      systemPrompt: `You are a study-notes assistant. Use only the supplied article content; do not add outside facts.

Return a JSON object containing:
- shortSummary: a concise overview in 2-3 sentences.
- detailedSummary: a faithful summary of the article's main reasoning.
- examBullets: 5-8 concise, useful revision notes drawn directly from the article. Prioritize key concepts, definitions, mechanisms, distinctions, and important conclusions. Each note must be understandable on its own and specific enough to help someone revise. Do not include generic advice or facts absent from the article.
- keyTakeaway: one memorable sentence supported by the article.
- suggestedTitles: 3 clear alternative titles.

No markdown, commentary, or preamble.`,
      userContent: `Article title: ${post.title}\n\nArticle content:\n${content.slice(0, 7000)}`,
      jsonMode: true,
      temperature: 0.5,
      maxTokens: 1800,
      throwOnError: Boolean(queueJobKey)
    });

    if (queueJobKey && result && ![
      result.shortSummary,
      result.detailedSummary,
      result.keyTakeaway,
      ...(Array.isArray(result.examBullets) ? result.examBullets : []),
      ...(Array.isArray(result.suggestedTitles) ? result.suggestedTitles : [])
    ].some((value) => typeof value === 'string' && value.trim())) {
      const error = new Error('AI response did not contain usable post metadata');
      error.permanent = true;
      throw error;
    }

    if (result) {
      post.aiMeta.shortSummary = normalizeText(result.shortSummary) || summarizeText(content).shortSummary;
      post.aiMeta.detailedSummary = normalizeText(result.detailedSummary) || summarizeText(content).detailedSummary;
      const generatedExamBullets = uniqueStrings(Array.isArray(result.examBullets) ? result.examBullets : [], 8);
      if (generatedExamBullets.length) {
        post.aiMeta.examBullets = generatedExamBullets;
        post.aiMeta.examBulletsSource = 'groq';
      } else {
        post.aiMeta.examBullets = summarizeText(content).examBullets;
        post.aiMeta.examBulletsSource = 'fallback';
      }
      post.aiMeta.keyTakeaway = normalizeText(result.keyTakeaway) || summarizeText(content).keyTakeaway;
      post.aiMeta.suggestedTitles = uniqueStrings(Array.isArray(result.suggestedTitles) ? result.suggestedTitles : [], 5);
    } else {
      const fallback = summarizeText(content);
      post.aiMeta.shortSummary = fallback.shortSummary;
      post.aiMeta.detailedSummary = fallback.detailedSummary;
      post.aiMeta.examBullets = fallback.examBullets;
      post.aiMeta.examBulletsSource = 'fallback';
      post.aiMeta.keyTakeaway = fallback.keyTakeaway;
      post.aiMeta.suggestedTitles = fallbackTitlesFromContent(`${post.title}. ${content}`).map((item) => item.text);
    }

    post.aiMeta.generatedAt = new Date();
    post.aiMeta.status = 'done';
    if (queueJobKey) {
      const aiMeta = post.aiMeta.toObject ? post.aiMeta.toObject() : post.aiMeta;
      const update = await Post.updateOne({
        _id: postId,
        status: 'published',
        'aiMeta.jobKey': queueJobKey,
        ...(claimToken ? { 'aiMeta.claimToken': claimToken } : {})
      }, {
        $set: {
          'aiMeta.shortSummary': aiMeta.shortSummary,
          'aiMeta.detailedSummary': aiMeta.detailedSummary,
          'aiMeta.examBullets': aiMeta.examBullets,
          'aiMeta.examBulletsSource': aiMeta.examBulletsSource,
          'aiMeta.keyTakeaway': aiMeta.keyTakeaway,
          'aiMeta.suggestedTitles': aiMeta.suggestedTitles,
          'aiMeta.generatedAt': aiMeta.generatedAt,
          'aiMeta.status': 'done'
        },
        $unset: { 'aiMeta.claimJobId': 1, 'aiMeta.claimToken': 1, 'aiMeta.claimedAt': 1 }
      });
      if (!update.matchedCount) return false;
    } else {
      await post.save();
    }
    return true;
  } catch (err) {
    if (queueJobKey) throw err;
    post.aiMeta.status = 'failed';
    await post.save();
    console.error('AI meta generation failed:', err.message);
    return false;
  }
};

exports.generatePostMeta = async (postId) => {
  const key = String(postId);
  if (postMetaTasks.has(key)) return postMetaTasks.get(key);
  const task = runPostMetaGeneration(postId);
  postMetaTasks.set(key, task);
  try {
    return await task;
  } finally {
    if (postMetaTasks.get(key) === task) postMetaTasks.delete(key);
  }
};

exports.generatePostMetaForJob = (postId, jobKey, claimToken) => runPostMetaGeneration(postId, { queueJobKey: jobKey, claimToken });

exports.suggestTitles = async (content) => {
  const snapshot = buildDraftSnapshot('', content);
  const result = await callAI({
    systemPrompt: `You are a headline writer. Generate 5 distinct, engaging titles based on the draft below.

Rules:
- Use concrete language from the draft.
- Make the 5 titles feel meaningfully different.
- Avoid bland generic phrasing.
- Keep titles under 70 characters when possible.
- Return JSON: { "titles": [{ "text": "...", "style": "punchy|analytical|question|how-to|narrative", "rationale": "..." }] }`,
    userContent: `Key phrases: ${snapshot.phrases.slice(0, 8).join(', ')}\nKey keywords: ${snapshot.keywords.slice(0, 8).join(', ')}\n\nDraft:\n${snapshot.combined.slice(0, 5000)}`,
    jsonMode: true,
    temperature: 0.7,
    maxTokens: 900
  });

  const normalized = normalizeTitleSuggestions(result);
  return normalized.length > 0 ? normalized : fallbackTitlesFromContent(content);
};

exports.generateTags = async (title, content) => {
  const snapshot = buildDraftSnapshot(title, content);
  const result = await callAI({
    systemPrompt: `Extract topic tags for filtering and discovery.

Rules:
- Choose specific tags that would help someone find this post later.
- Prefer real phrases from the draft over generic labels.
- Tags should be 1-3 words, lowercase, and no duplicates.
- Return JSON: { "tags": [{ "tag": "...", "confidence": 0.0-1.0, "type": "primary|secondary|related" }] }`,
    userContent: `Title: ${snapshot.title}\n\nDraft snapshot:\n- Key phrases: ${snapshot.phrases.slice(0, 10).join(', ')}\n- Key keywords: ${snapshot.keywords.slice(0, 10).join(', ')}\n\nContent:\n${snapshot.combined.slice(0, 4000)}`,
    jsonMode: true,
    temperature: 0.5,
    maxTokens: 700
  });

  return normalizeTagSuggestions(result, title, content);
};

exports.rankComments = async (postId) => {
  const post = await Post.findById(postId).select('title');
  if (!post) return false;

  const comments = await Comment.find({ postId }).populate('authorId', 'username').limit(50);
  if (!comments.length) return true;

  const result = await callAI({
    systemPrompt: `Rank comments for a top-comments feature.

Score each comment from 1-10 using this rubric:
- Insight: adds a real idea, clarification, correction, or question.
- Relevance: engages with the post's actual content.
- Respectfulness: civil and constructive.
- Uniqueness: not a duplicate of other comments.

A comment like "great post!" should score low.
Return JSON: { "ranked": [{ "commentId": "...", "score": 0, "reason": "..." }] } and include every comment.`,
    userContent: `Post title: ${post.title}\n\nComments:\n${JSON.stringify(comments.map((c) => ({ id: c._id, content: truncate(c.content, 300) })))} `,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 1500
  });

  if (!Array.isArray(result?.ranked)) return false;

  const allowedIds = new Set(comments.map((comment) => comment._id.toString()));
  const top3 = [...result.ranked]
    .filter((item) => allowedIds.has(String(item?.commentId)))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 3);

  await Comment.updateMany({ postId }, { isTopComment: false, topCommentScore: 0 });
  await Promise.all(top3.map((item) => Comment.findOneAndUpdate(
    { _id: item.commentId, postId },
    { isTopComment: true, topCommentScore: Math.max(0, Math.min(10, Number(item.score) || 0)) }
  )));
  return true;
};

exports.generateWritingAssist = async (title, content) => {
  const snapshot = buildDraftSnapshot(title, content);
  const result = await callAI({
    systemPrompt: `You are a writing coach. Help the author make the draft clearer, more natural, and easier to publish.

Return JSON with exactly these keys:
- overview: one short paragraph describing what the draft is trying to do.
- audience: who this draft seems written for.
- tone: the current tone in a few words.
- strengths: 3-5 concrete things the draft already does well.
- frictionPoints: 3-5 concrete places where the draft feels vague, repetitive, or hard to follow.
- suggestedStructure: 3-6 bullets that describe a better flow for the piece.
- nextEdits: 3-6 practical editing suggestions the author could apply right now.
- openingHook: one rewrite suggestion for the opening idea.
- titleAngles: 3-5 title directions.
- tagIdeas: 3-6 tag ideas.
- rewritePrompt: a short one-sentence prompt the author could use to continue editing.

Use natural language, not jargon, and stay grounded in the actual draft.`,
    userContent: `Title: ${snapshot.title}\n\nDraft cues:\n- Word count: ${snapshot.wordCount}\n- First person: ${snapshot.hasFirstPerson ? 'yes' : 'no'}\n- Contains questions: ${snapshot.hasQuestions ? 'yes' : 'no'}\n- Key phrases: ${snapshot.phrases.slice(0, 8).join(', ')}\n- Key keywords: ${snapshot.keywords.slice(0, 8).join(', ')}\n\nDraft text:\n${snapshot.combined.slice(0, 7000)}`,
    jsonMode: true,
    temperature: 0.6,
    maxTokens: 1200
  });

  if (result) return normalizeWritingAssist(result, snapshot);

  return {
    overview: truncate(snapshot.leadParagraph || snapshot.combined, 220),
    audience: 'Readers who want a clearer, more useful version of the draft.',
    tone: snapshot.hasFirstPerson ? 'conversational' : 'clear and direct',
    strengths: uniqueStrings(snapshot.keywords.slice(0, 4).map((keyword) => `The draft already centers on ${keyword}.`), 5),
    frictionPoints: uniqueStrings([
      'The opening could state the main point more directly.',
      'Some ideas may need a clearer transition between them.',
      'A few details could be turned into concrete examples.'
    ], 5),
    suggestedStructure: uniqueStrings([
      'Start with the core point in one sentence.',
      'Add the main supporting idea or example next.',
      'Close with the practical takeaway.'
    ], 5),
    nextEdits: uniqueStrings([
      'Tighten the introduction so the reader sees the point faster.',
      'Turn any vague statements into one concrete example.',
      'Break long paragraphs into smaller, easier-to-scan chunks.'
    ], 5),
    openingHook: truncate(snapshot.leadSentence || snapshot.combined, 140),
    titleAngles: fallbackTitlesFromContent(snapshot.combined).map((item) => item.text).slice(0, 5),
    tagIdeas: fallbackTagsFromContent(snapshot.title, snapshot.content).map((item) => item.tag),
    rewritePrompt: 'Tighten the draft around one clear idea and make the examples more concrete.'
  };
};

exports.rewriteDraft = async (text, mode = 'clearer') => {
  const snapshot = buildDraftSnapshot('', text);
  const prompts = {
    clearer: 'Make the draft clearer, easier to scan, and more natural while preserving meaning.',
    shorter: 'Shorten the draft without losing important meaning.',
    warmer: 'Make the draft warmer and more conversational.',
    moreProfessional: 'Make the draft sound more polished and professional.',
    moreEngaging: 'Make the draft more engaging and vivid without adding fake claims.'
  };

  const instruction = prompts[mode] || prompts.clearer;
  const result = await callAI({
    systemPrompt: `You are a writing editor. ${instruction}\n\nReturn JSON: { "rewritten": "...", "notes": ["...", "..."] }`,
    userContent: snapshot.combined.slice(0, 5000),
    jsonMode: true,
    temperature: 0.65,
    maxTokens: 900
  });

  if (result?.rewritten) {
    return {
      rewritten: normalizeText(result.rewritten),
      notes: uniqueStrings(Array.isArray(result.notes) ? result.notes : [], 5)
    };
  }

  return {
    rewritten: snapshot.combined,
    notes: [instruction]
  };
};
