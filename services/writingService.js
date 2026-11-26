const openai = require('../utils/openaiClient');

const HALF_BANDS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

const CRITERION_KEYS = [
  'taskAchievement',
  'coherenceAndCohesion',
  'lexicalResource',
  'grammaticalRangeAndAccuracy',
];

const CRITERION_LABELS = {
  taskAchievement: 'Task Achievement',
  coherenceAndCohesion: 'Coherence and Cohesion',
  lexicalResource: 'Lexical Resource',
  grammaticalRangeAndAccuracy: 'Grammatical Range and Accuracy',
};

function clampHalfBand(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  let nearest = 0;
  let best = Infinity;
  for (const band of HALF_BANDS) {
    const diff = Math.abs(band - num);
    if (diff < best) {
      best = diff;
      nearest = band;
    }
  }
  return nearest;
}

function roundOverallBand(avg) {
  // IELTS: average of 4 criteria, round to nearest 0.5
  return clampHalfBand(avg);
}

function normalizeScoreBlock(raw = {}) {
  const score = {};
  for (const key of CRITERION_KEYS) {
    score[key] = clampHalfBand(raw[key]);
  }
  const avg =
    (score.taskAchievement +
      score.coherenceAndCohesion +
      score.lexicalResource +
      score.grammaticalRangeAndAccuracy) /
    4;
  // Always recompute overall from clamped criteria (drops stored 7.8-style values)
  score.overallBandScore = roundOverallBand(avg);
  return score;
}

function normalizeSubmissionScores(submission) {
  if (!submission || typeof submission !== 'object') return submission;
  const score = normalizeScoreBlock(submission.score || {});
  const detailedFeedback = { ...(submission.detailedFeedback || {}) };
  for (const key of CRITERION_KEYS) {
    const block = detailedFeedback[key];
    if (block && typeof block === 'object') {
      detailedFeedback[key] = { ...block, score: score[key] };
    } else if (block != null || score[key] != null) {
      detailedFeedback[key] = { score: score[key] };
    }
  }
  return { ...submission, score, detailedFeedback };
}

function asString(value, fallback = '') {
  if (value == null) return fallback;
  return String(value);
}

function asStringArray(value, max = 3) {
  if (!Array.isArray(value)) {
    if (typeof value === 'string' && value.trim()) return [value.trim()].slice(0, max);
    return [];
  }
  return value
    .map((item) => asString(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function asMistakePairs(value, max = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const wrong = asString(item.wrong).trim();
      const correct = asString(item.correct).trim();
      if (!wrong || !correct) return null;
      return { wrong, correct };
    })
    .filter(Boolean)
    .slice(0, max);
}

function pairsToLegacyString(pairs) {
  if (!pairs.length) return '';
  return pairs.map((p) => `❌ ${p.wrong} ❌ → ✅ ${p.correct} ✅`).join('\n');
}

function stripMarkdownFences(content) {
  let text = asString(content).trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

function buildCriterionFeedback(raw = {}) {
  return {
    score: clampHalfBand(raw.score),
    strengths: asStringArray(raw.strengths, 3),
    weaknesses: asStringArray(raw.weaknesses, 3),
    suggestions: asStringArray(raw.suggestions, 3),
  };
}

function pickWeakestCriterion(scores) {
  let weakestKey = 'taskAchievement';
  let weakestScore = 9;
  for (const key of CRITERION_KEYS) {
    if (scores[key] < weakestScore) {
      weakestScore = scores[key];
      weakestKey = key;
    }
  }
  return weakestKey;
}

function buildQuestionPrompt(question) {
  const q = asString(question).trim() || 'No question provided';
  return `Write about this exact topic only: "${q}".
The answer must stay on this topic. Do not write about a different topic.`;
}

function buildSystemPrompt({ userInput, question, taskType }) {
  const questionPrompt = buildQuestionPrompt(question);

  return `You are a STRICT official-style IELTS Writing examiner. Do NOT inflate scores. A short, simple, repetitive answer must NOT receive Band 6+.

Task type: ${taskType || 'Task 2'}
For personal topics (family, food, school, routine), score Task Response like IELTS Task 2 / GT letter ideas: development, relevance, clarity—NOT Academic Task 1 chart language.

===== QUESTION (required topic) =====
${questionPrompt}

===== STUDENT ANSWER =====
${userInput}
===== END =====

Relevance check (FIRST):
- Compare QUESTION vs ANSWER topic.
- topicRelevance: "on-topic" | "partially-related" | "off-topic"
- topicMismatchReason: short English reason ("" if on-topic)
- off-topic => taskAchievement <= 3.0
- partially-related => taskAchievement <= 5.0

OFFICIAL-STYLE BAND ANCHORS (use these; do not be generous):
Band 9: fully addresses task; seamless cohesion; precise uncommon vocab; full flexibility/accuracy.
Band 8: well-developed, well-organized; wide vocab skillfully used; wide grammar range, mostly error-free.
Band 7: clear position/development; logical cohesion; sufficient range, some flexibility; frequent error-free sentences, good complex structures.
Band 6: addresses task adequately though some parts better; generally coherent; adequate vocab for the task despite some errors; mix of simple/complex with errors that rarely reduce communication.
Band 5: addresses task only partially / limited development; basic organization, inadequate/inaccurate cohesive devices; limited vocab, noticeable repetition; limited complex sentences, frequent errors.
Band 4: limited response; limited coherence, basic/repetitive linking; simple vocab, frequent repetition; rare complex sentences, many errors, meaning sometimes unclear.
Band 3 or below: very limited, off-topic, or hard to follow.

ANTI-INFLATION (mandatory):
- Clear + mostly correct simple English is NOT Band 7.
- Heavy repetition (very/favorite/delicious/usually/I like) => lexicalResource <= 5.0
- Mostly short simple sentences, little complex grammar => grammaticalRangeAndAccuracy <= 5.0
- Ideas undeveloped (few details/examples/explanation) => taskAchievement <= 5.0
- Basic linking only (and/but/because/so) with short paragraphs => coherenceAndCohesion <= 5.0
- If MOST of the above apply, overall should be about 4.0–5.0, NEVER 6.5–7.5
- Band 7+ requires clear development, flexible vocabulary, AND controlled complex grammar together.

Scoring rules:
- Half-band scores ONLY: 0, 0.5, 1.0 ... 9.0 (never 5.8 / 7.8)
- Criteria keys: taskAchievement, coherenceAndCohesion, lexicalResource, grammaticalRangeAndAccuracy
- overallBandScore = average of 4, rounded to nearest 0.5
- Cite concrete examples from the student text in strengths/weaknesses
- Max 8 wordMistakes and 8 sentenceMistakes as { "wrong", "correct" }
- topPriorities: exactly 3 tips (off-topic => tip #1 rewrite on the question)
- nextFocus: off/partial topic => criterion taskAchievement
- AiGenerateWriting: "0%"..."100%"
- AiMotivation / AiSuggestions: short
- ReWriteImprovementVersion: ON-TOPIC improved essay for the QUESTION
- Legacy: ReWriteCorrectWords / ReWriteCorrectSentences as ❌ wrong ❌ → ✅ correct ✅
- generalFeedback: 2–4 sentences; state if band is limited by simplicity/repetition
- Return JSON ONLY

Required JSON shape:
{
  "topicRelevance": "on-topic",
  "topicMismatchReason": "",
  "AiGenerateWriting": "0%",
  "AiMotivation": "",
  "AiSuggestions": "",
  "TotalGrammerError": "0",
  "TotalVocabularyError": "0",
  "TotalSentenceError": "0",
  "ReWriteCorrectWords": "",
  "ReWriteCorrectSentences": "",
  "ReWriteImprovementVersion": "",
  "wordMistakes": [{ "wrong": "", "correct": "" }],
  "sentenceMistakes": [{ "wrong": "", "correct": "" }],
  "topPriorities": ["", "", ""],
  "nextFocus": {
    "criterion": "taskAchievement|coherenceAndCohesion|lexicalResource|grammaticalRangeAndAccuracy",
    "action": "",
    "practiceTip": ""
  },
  "score": {
    "taskAchievement": 0,
    "coherenceAndCohesion": 0,
    "lexicalResource": 0,
    "grammaticalRangeAndAccuracy": 0
  },
  "detailedFeedback": {
    "taskAchievement": { "score": 0, "strengths": [], "weaknesses": [], "suggestions": [] },
    "coherenceAndCohesion": { "score": 0, "strengths": [], "weaknesses": [], "suggestions": [] },
    "lexicalResource": { "score": 0, "strengths": [], "weaknesses": [], "suggestions": [] },
    "grammaticalRangeAndAccuracy": { "score": 0, "strengths": [], "weaknesses": [], "suggestions": [] }
  },
  "overallBandScore": 0,
  "generalFeedback": ""
}`;
}

const TOPIC_RELEVANCE = new Set(['on-topic', 'partially-related', 'off-topic']);
const TA_CAP_BY_RELEVANCE = {
  'off-topic': 3,
  'partially-related': 5,
  'on-topic': 9,
};

function normalizeTopicRelevance(value) {
  const key = asString(value).trim().toLowerCase().replace(/\s+/g, '-');
  if (TOPIC_RELEVANCE.has(key)) return key;
  if (key.includes('off')) return 'off-topic';
  if (key.includes('partial')) return 'partially-related';
  return 'on-topic';
}

function applyTopicRelevanceCap(score, detailedFeedback, topicRelevance, question) {
  const cap = TA_CAP_BY_RELEVANCE[topicRelevance] ?? 9;
  if (score.taskAchievement > cap) {
    score.taskAchievement = cap;
    detailedFeedback.taskAchievement.score = cap;
  }

  if (topicRelevance === 'off-topic' || topicRelevance === 'partially-related') {
    const mismatchNote =
      topicRelevance === 'off-topic'
        ? `Answer is off-topic for "${question}". Rewrite about this question only.`
        : `Answer only partly matches "${question}". Cover the full topic more clearly.`;

    const weaknesses = detailedFeedback.taskAchievement.weaknesses || [];
    if (!weaknesses.some((w) => /off-topic|topic|question/i.test(w))) {
      detailedFeedback.taskAchievement.weaknesses = [mismatchNote, ...weaknesses].slice(0, 3);
    }

    const suggestions = detailedFeedback.taskAchievement.suggestions || [];
    const rewriteTip = `Write a new answer that stays on the question: "${question}".`;
    if (!suggestions.some((s) => /question|topic/i.test(s))) {
      detailedFeedback.taskAchievement.suggestions = [rewriteTip, ...suggestions].slice(0, 3);
    }
  }

  return score;
}

const BASIC_LINKERS = new Set([
  'and', 'but', 'because', 'so', 'then', 'also', 'or', 'when', 'if',
]);

const WEAK_REPEAT_WORDS = [
  'very', 'favorite', 'favourite', 'delicious', 'tasty', 'usually', 'happy',
  'good', 'nice', 'like', 'love', 'food', 'eat', 'eating',
];

function analyzeWritingFeatures(text) {
  const raw = asString(text).trim();
  const words = raw.toLowerCase().match(/[a-z']+/g) || [];
  const wordCount = words.length;
  const sentences = raw
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentenceCount = Math.max(sentences.length, 1);

  const unique = new Set(words);
  const typeTokenRatio = wordCount ? unique.size / wordCount : 0;

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const repeatedWeak = WEAK_REPEAT_WORDS.filter((w) => (freq[w] || 0) >= 3).length;

  let complexCount = 0;
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (
      /\b(although|however|therefore|whereas|which|who|that|while|because|if|when|after|before)\b/.test(
        lower
      ) ||
      (s.match(/,/g) || []).length >= 2
    ) {
      complexCount += 1;
    }
  }
  const complexRatio = complexCount / sentenceCount;

  const linkerHits = words.filter((w) => BASIC_LINKERS.has(w)).length;
  const advancedLinker = /\b(however|therefore|moreover|furthermore|whereas|nevertheless|in addition|as a result)\b/i.test(
    raw
  );

  const avgSentenceLen = wordCount / sentenceCount;

  return {
    wordCount,
    sentenceCount,
    typeTokenRatio,
    repeatedWeak,
    complexRatio,
    linkerHits,
    advancedLinker,
    avgSentenceLen,
    mostlySimple:
      complexRatio < 0.25 && avgSentenceLen > 0 && avgSentenceLen <= 16,
    repetitive: typeTokenRatio < 0.52 || repeatedWeak >= 2,
    underdeveloped: wordCount > 0 && wordCount < 180,
    basicCohesion: !advancedLinker && linkerHits >= 3,
  };
}

function capCriterion(score, detailedFeedback, key, maxBand, reason) {
  if (score[key] <= maxBand) return;
  score[key] = maxBand;
  if (detailedFeedback[key]) {
    detailedFeedback[key].score = maxBand;
    const weaknesses = detailedFeedback[key].weaknesses || [];
    if (reason && !weaknesses.includes(reason)) {
      detailedFeedback[key].weaknesses = [reason, ...weaknesses].slice(0, 3);
    }
  }
}

/**
 * Server-side IELTS-style guardrails so GPT cannot inflate beginner writing to 6.5–7+.
 */
function applyDescriptorGuardrails(score, detailedFeedback, userInput) {
  const f = analyzeWritingFeatures(userInput);
  if (!f.wordCount) return score;

  if (f.repetitive) {
    capCriterion(
      score,
      detailedFeedback,
      'lexicalResource',
      5.0,
      'Vocabulary is limited and repetitive for higher IELTS bands.'
    );
  }
  if (f.mostlySimple) {
    capCriterion(
      score,
      detailedFeedback,
      'grammaticalRangeAndAccuracy',
      5.0,
      'Mostly simple sentences; limited complex grammar range.'
    );
  }
  if (f.underdeveloped || f.repetitive) {
    capCriterion(
      score,
      detailedFeedback,
      'taskAchievement',
      5.0,
      'Ideas are underdeveloped or too basic for Band 6+ Task Response.'
    );
  }
  if (f.basicCohesion && (f.underdeveloped || f.mostlySimple)) {
    capCriterion(
      score,
      detailedFeedback,
      'coherenceAndCohesion',
      5.0,
      'Cohesion is basic (simple linkers) with limited organization.'
    );
  }

  // Strong beginner pattern: short + repetitive + simple => keep overall around 4–5
  if (f.underdeveloped && f.repetitive && f.mostlySimple) {
    capCriterion(score, detailedFeedback, 'taskAchievement', 4.5);
    capCriterion(score, detailedFeedback, 'coherenceAndCohesion', 4.5);
    capCriterion(score, detailedFeedback, 'lexicalResource', 4.5);
    capCriterion(score, detailedFeedback, 'grammaticalRangeAndAccuracy', 5.0);
  }

  // Very short answers
  if (f.wordCount < 100) {
    capCriterion(
      score,
      detailedFeedback,
      'taskAchievement',
      4.0,
      'Answer is too short to fully address the task.'
    );
  }

  return score;
}

function sanitizeEvaluation(raw = {}, context = {}) {
  const question = asString(context.question).trim() || 'the given question';
  const detailedFeedback = {};
  const score = {};

  for (const key of CRITERION_KEYS) {
    const fromDetailed = raw.detailedFeedback?.[key];
    const fromLegacy = raw[key];
    const fromScore = raw.score?.[key];

    const merged = {
      ...(typeof fromLegacy === 'object' ? fromLegacy : {}),
      ...(typeof fromDetailed === 'object' ? fromDetailed : {}),
    };
    if (fromScore != null && merged.score == null) merged.score = fromScore;
    if (typeof fromLegacy === 'number') merged.score = fromLegacy;

    detailedFeedback[key] = buildCriterionFeedback(merged);
    score[key] = detailedFeedback[key].score;
  }

  const topicRelevance = normalizeTopicRelevance(raw.topicRelevance);
  const topicMismatchReason = asString(raw.topicMismatchReason).trim();
  applyTopicRelevanceCap(score, detailedFeedback, topicRelevance, question);
  applyDescriptorGuardrails(score, detailedFeedback, context.userInput || '');

  // Re-clamp after caps
  for (const key of CRITERION_KEYS) {
    score[key] = clampHalfBand(score[key]);
    if (detailedFeedback[key]) detailedFeedback[key].score = score[key];
  }

  const avg =
    (score.taskAchievement +
      score.coherenceAndCohesion +
      score.lexicalResource +
      score.grammaticalRangeAndAccuracy) /
    4;
  const overallBandScore = roundOverallBand(avg);

  let wordMistakes = asMistakePairs(raw.wordMistakes, 8);
  let sentenceMistakes = asMistakePairs(raw.sentenceMistakes, 8);

  const ReWriteCorrectWords =
    asString(raw.ReWriteCorrectWords) || pairsToLegacyString(wordMistakes);
  const ReWriteCorrectSentences =
    asString(raw.ReWriteCorrectSentences) || pairsToLegacyString(sentenceMistakes);

  let topPriorities = asStringArray(raw.topPriorities, 3);
  if (topicRelevance !== 'on-topic') {
    const topicTip = `Rewrite your answer about this question only: "${question}".`;
    topPriorities = [topicTip, ...topPriorities.filter((t) => t !== topicTip)].slice(0, 3);
  }
  while (topPriorities.length < 3) {
    topPriorities.push('Review the examiner comments and rewrite one paragraph carefully.');
  }

  let weakest = pickWeakestCriterion(score);
  if (topicRelevance !== 'on-topic') {
    weakest = 'taskAchievement';
  }

  const nextFocusRaw = raw.nextFocus && typeof raw.nextFocus === 'object' ? raw.nextFocus : {};
  const nextFocus = {
    criterion:
      topicRelevance !== 'on-topic'
        ? 'taskAchievement'
        : CRITERION_KEYS.includes(nextFocusRaw.criterion)
          ? nextFocusRaw.criterion
          : weakest,
    action:
      asString(nextFocusRaw.action).trim() ||
      (topicRelevance !== 'on-topic'
        ? `Answer the question "${question}" directly in your next attempt.`
        : `Improve ${CRITERION_LABELS[weakest]} in your next attempt.`),
    practiceTip:
      asString(nextFocusRaw.practiceTip).trim() ||
      (topicRelevance !== 'on-topic'
        ? `Write 120+ words only about "${question}" — do not change the topic.`
        : `Rewrite the same essay focusing only on ${CRITERION_LABELS[weakest]}.`),
  };

  let generalFeedback = asString(raw.generalFeedback).trim();
  if (topicRelevance === 'off-topic') {
    const prefix = `Your answer did not address the question "${question}".`;
    if (!/did not address|off-topic|wrong topic/i.test(generalFeedback)) {
      generalFeedback = generalFeedback ? `${prefix} ${generalFeedback}` : prefix;
    }
  }

  // Legacy nested shape expected by older controller mapping
  const taskAchievement = detailedFeedback.taskAchievement;
  const coherenceAndCohesion = detailedFeedback.coherenceAndCohesion;
  const lexicalResource = detailedFeedback.lexicalResource;
  const grammaticalRangeAndAccuracy = detailedFeedback.grammaticalRangeAndAccuracy;

  return {
    topicRelevance,
    topicMismatchReason,
    question,
    answer: asString(context.userInput),
    AiGenerateWriting: asString(raw.AiGenerateWriting, '0%'),
    AiMotivation: asString(raw.AiMotivation),
    AiSuggestions: asString(raw.AiSuggestions),
    TotalGrammerError: asString(raw.TotalGrammerError, '0'),
    TotalVocabularyError: asString(raw.TotalVocabularyError, '0'),
    TotalSentenceError: asString(raw.TotalSentenceError, '0'),
    ReWriteCorrectWords,
    ReWriteCorrectSentences,
    ReWriteImprovementVersion: asString(raw.ReWriteImprovementVersion),
    wordMistakes,
    sentenceMistakes,
    topPriorities,
    nextFocus,
    score,
    detailedFeedback,
    overallBandScore,
    generalFeedback,
    // legacy aliases
    taskAchievement,
    coherenceAndCohesion,
    lexicalResource,
    grammaticalRangeAndAccuracy,
  };
}

const generateWritingResponse = async (userInput, question, taskType = 'Task 2') => {
  const safeQuestion = question || 'No question provided';
  const systemPrompt = buildSystemPrompt({
    userInput,
    question: safeQuestion,
    taskType,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Evaluate this IELTS writing answer and return JSON only.

QUESTION (must match):
${safeQuestion}

STUDENT ANSWER:
${userInput}

Rules reminder:
- If off-topic, topicRelevance="off-topic" and taskAchievement <= 3.0.
- Do NOT inflate. Simple repetitive beginner writing is about Band 4–5, not 7.`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty content.');
    }

    let parsed;
    try {
      parsed = JSON.parse(stripMarkdownFences(content));
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw OpenAI response content:', content);
      throw new Error('Failed to parse evaluation data from AI service.');
    }

    return sanitizeEvaluation(parsed, { question: safeQuestion, userInput });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    if (
      error.message === 'Failed to parse evaluation data from AI service.' ||
      error.message === 'OpenAI returned empty content.'
    ) {
      throw error;
    }
    throw new Error('Failed to get evaluation from AI service.');
  }
};

/**
 * Full integer bands above the user's score, capped at 9.
 * 6 / 6.5 -> [7,8,9] | 7 / 7.5 -> [8,9] | 8 / 8.5 -> [9] | 9 -> []
 */
function getHigherFullBands(userBand) {
  const band = Number(userBand);
  if (!Number.isFinite(band) || band >= 9) return [];
  const start = Math.floor(band) + 1;
  const targets = [];
  for (let b = start; b <= 9; b += 1) targets.push(b);
  return targets;
}

function sanitizeBandSamples(raw, targets) {
  const list = Array.isArray(raw?.samples) ? raw.samples : Array.isArray(raw) ? raw : [];
  const byBand = new Map();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const targetBand = Math.round(Number(item.targetBand));
    if (!targets.includes(targetBand)) continue;
    const writing = asString(item.writing).trim();
    if (!writing) continue;
    byBand.set(targetBand, {
      targetBand,
      writing,
      whyHigher: asStringArray(item.whyHigher, 4),
    });
  }
  return targets.map((b) => byBand.get(b)).filter(Boolean);
}

async function generateBandSamples({ question, userInput, userBand, taskType = 'Task 2' }) {
  const targets = getHigherFullBands(userBand);
  if (!targets.length) return [];

  const systemPrompt = `You are an IELTS Writing coach. Create model answers for HIGHER FULL BANDS only.

Student predicted band: ${userBand}
Target FULL bands only: ${targets.join(', ')}
Task type: ${taskType}

Question:
${question}

Student answer (keep similar ideas/topic; upgrade quality for each target band):
${userInput}

Rules:
- Generate one complete writing sample per target band (${targets.join(', ')}).
- Integer bands only (no 7.5 / 8.5).
- Same question; similar ideas as the student when on-topic.
- Higher bands must show clearer structure, better vocabulary, stronger grammar, and fuller development.
- For each sample include 2-4 short bullets in whyHigher explaining what makes it that band vs lower.
- Return JSON only.

JSON shape:
{
  "samples": [
    {
      "targetBand": ${targets[0]},
      "writing": "full essay text",
      "whyHigher": ["...", "..."]
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate model writings for bands: ${targets.join(', ')}. JSON only.`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    let parsed;
    try {
      parsed = JSON.parse(stripMarkdownFences(content));
    } catch (err) {
      console.error('Failed to parse band samples:', err);
      return [];
    }

    return sanitizeBandSamples(parsed, targets);
  } catch (error) {
    console.error('Error generating band samples:', error);
    return [];
  }
}

module.exports = {
  generateWritingResponse,
  generateBandSamples,
  getHigherFullBands,
  sanitizeEvaluation,
  analyzeWritingFeatures,
  applyDescriptorGuardrails,
  clampHalfBand,
  roundOverallBand,
  normalizeScoreBlock,
  normalizeSubmissionScores,
  buildSystemPrompt,
  CRITERION_KEYS,
};
