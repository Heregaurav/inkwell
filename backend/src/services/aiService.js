const OpenAI = require('openai');
const Post = require('../models/Post');
const { Comment } = require('../models/Other');

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const hasAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

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

async function callAI({ systemPrompt, userContent, jsonMode = true, temperature = 0.4, maxTokens = 1000 }) {
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      response_format: jsonMode ? { type: 'json_object' } : undefined,
      temperature,
      max_tokens: maxTokens
    });

    const text = response.choices?.[0]?.message?.content || '';
    if (!jsonMode) return text;

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (err) {
    console.warn('AI call fallback:', err?.status || '', err?.message || 'unknown error');
    return null;
  }
}

exports.aiStatus = () => ({ enabled: hasAI, model: MODEL });

// ---------------------------------------------------------------------------
// ELI5 - improved with better fallback and more creative prompt
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ELI5 - enhanced fallback using full post content (if available)
// ---------------------------------------------------------------------------

function fallbackEli5(snapshot, text, context = {}) {
  // 1. Try to get a proper summary from the selected text
  const selectionSummary = summarizeText(snapshot.combined);
  
  // 2. If we have full post content, get its summary (much richer)
  let fullSummary = null;
  if (context.fullContent) {
    const postSummary = summarizeText(context.fullContent);
    if (postSummary.detailedSummary && postSummary.detailedSummary.length > 20) {
      fullSummary = postSummary.detailedSummary;
    } else if (postSummary.shortSummary) {
      fullSummary = postSummary.shortSummary;
    }
  }

  // 3. If selection is very short, use the full post summary (if available)
  if (text.length < 100) {
    if (fullSummary) {
      return `The selected text is a short excerpt. Here’s a broader summary of the article: ${fullSummary}`;
    }
    if (context.postSummary) {
      return `The selected text is a short excerpt. Here’s a broader summary of the article: ${context.postSummary}`;
    }
    if (context.extraContext) {
      return `The selected text touches on ${context.extraContext}. Try selecting a longer passage for a more detailed explanation.`;
    }
    // Final fallback for short text with no extra context
    const keywords = snapshot.keywords.slice(0, 5).join(', ');
    return `You selected a short phrase. The key terms are: ${keywords || 'unknown'}. Please highlight a longer passage for a full explanation.`;
  }

  // 4. For longer selections, prefer the selection's detailed summary
  if (selectionSummary.detailedSummary && selectionSummary.detailedSummary.length > 20) {
    return selectionSummary.detailedSummary;
  }
  if (selectionSummary.shortSummary && selectionSummary.shortSummary.length > 10) {
    return selectionSummary.shortSummary;
  }

  // 5. Construct from first sentence and keywords (fallback)
  const first = snapshot.sentences[0] || '';
  const keywords = snapshot.keywords.slice(0, 4).join(', ');
  return `This passage covers ${keywords}. ${first}`.trim() || 'No explanation could be generated.';
}

exports.eli5 = async (text, context = {}) => {
  if (!text || !text.trim()) {
    return 'Nothing selected – please highlight some text to explain.';
  }

  const snapshot = buildDraftSnapshot(context.title || '', text);
  console.log(`[eli5] Request for text length ${text.length}, title: ${context.title || 'none'}`);

  // If AI is available, try it
  if (hasAI) {
    const contextLines = [
      context.title ? `Article title: ${context.title}` : '',
      context.section ? `Section: ${context.section}` : '',
      context.postSummary ? `Post summary: ${context.postSummary}` : '',
      context.extraContext ? `Extra context: ${context.extraContext}` : ''
    ].filter(Boolean);

    const systemPrompt = `You explain selected passages from articles to someone completely new to the topic – a beginner, but not a child.

Write a clear, detailed explanation in plain paragraphs:
- Assume no prior background knowledge. Define any technical term the first time you use it.
- Cover what it means, why it works or matters, and give a concrete example or analogy if it helps.
- Be thorough – a few short paragraphs is fine, this isn't a one‑liner.
- Stay grounded in the source text: don't contradict it, but you may add plausible examples, analogies, or broader context to make the idea stick.
- Use the surrounding context only to disambiguate meaning – explain the *selected text* itself, not the whole article.
- Plain prose only. No headings, no bullet lists, no JSON, no markdown formatting.`;

    const userContent = [
      contextLines.join('\n'),
      `Selected text to explain:\n${snapshot.combined.slice(0, 3000)}`
    ].filter(Boolean).join('\n\n');

    try {
      const result = await callAI({
        systemPrompt,
        userContent,
        jsonMode: false,
        temperature: 0.7,
        maxTokens: 700
      });

      if (result && result.trim()) {
        console.log(`[eli5] AI returned explanation of length ${result.length}`);
        return normalizeText(result);
      }
    } catch (err) {
      console.error('[eli5] AI call error:', err.message);
    }

    console.warn('[eli5] AI failed, falling back');
  }

  // If AI not available or failed, use fallback
  const fallback = fallbackEli5(snapshot, text, context);
  console.log(`[eli5] Fallback explanation length: ${fallback.length}, preview: "${fallback.slice(0, 100)}..."`);
  return fallback;
};
// ---------------------------------------------------------------------------
// Other AI functions - relaxed guidance
// ---------------------------------------------------------------------------

exports.generatePostMeta = async (postId) => {
  const post = await Post.findById(postId);
  if (!post) return;

  const content = blocksToText(post.blocks);
  if (!content || content.length < 50) return;

  const snapshot = buildDraftSnapshot(post.title, content);

  try {
    post.aiMeta.status = 'pending';
    await post.save();

    const result = await callAI({
      systemPrompt: `You are an editorial assistant. Help readers understand and remember this post.

Write naturally, following the draft's structure. Return JSON:
- shortSummary: a crisp overview (5-10 sentences).
- detailedSummary: a full, flowing summary that preserves the argument and examples.
- examBullets: 5-8 concrete, specific takeaways.
- keyTakeaway: one memorable sentence.
- suggestedTitles: 3 alternative, clear, engaging titles.

Be human, not robotic. No markdown, no commentary, no preamble.`,
      userContent: `Title: ${post.title}\n\nDraft snapshot:\n- Word count: ${snapshot.wordCount}\n- Key phrases: ${snapshot.phrases.slice(0, 6).join(', ')}\n- Key keywords: ${snapshot.keywords.slice(0, 6).join(', ')}\n\nFull content:\n${content.slice(0, 7000)}`,
      jsonMode: true,
      temperature: 0.5,
      maxTokens: 1800
    });

    if (result) {
      post.aiMeta.shortSummary = normalizeText(result.shortSummary) || summarizeText(content).shortSummary;
      post.aiMeta.detailedSummary = normalizeText(result.detailedSummary) || summarizeText(content).detailedSummary;
      post.aiMeta.examBullets = uniqueStrings(Array.isArray(result.examBullets) ? result.examBullets : [], 8);
      post.aiMeta.keyTakeaway = normalizeText(result.keyTakeaway) || summarizeText(content).keyTakeaway;
      post.aiMeta.suggestedTitles = uniqueStrings(Array.isArray(result.suggestedTitles) ? result.suggestedTitles : [], 5);
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
  if (!post) return;

  const comments = await Comment.find({ postId }).populate('authorId', 'username').limit(50);
  if (!comments.length) return;

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

  if (result?.ranked) {
    await Comment.updateMany({ postId }, { isTopComment: false, topCommentScore: 0 });
    const top3 = [...result.ranked]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 3);

    for (const item of top3) {
      if (!item?.commentId) continue;
      await Comment.findByIdAndUpdate(item.commentId, { isTopComment: true, topCommentScore: Number(item.score || 0) });
    }
  }
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