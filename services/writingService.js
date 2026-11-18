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

  return `You are a strict IELTS Writing examiner. Score using official IELTS Writing Band Descriptors.

Task type: ${taskType || 'Task 2'}

===== QUESTION (required topic) =====
${questionPrompt}

===== STUDENT ANSWER =====
${userInput}
===== END =====

Relevance check (do this FIRST before scoring):
- Compare QUESTION topic vs STUDENT ANSWER topic carefully.
- Example: question "My School" but answer about "My Family" = OFF-TOPIC.
- Example: question "My Daily Routine" but answer only about food with no routine = PARTIAL or OFF-TOPIC.
- Set topicRelevance to exactly one of: "on-topic" | "partially-related" | "off-topic"
- Set topicMismatchReason to a short English explanation (empty string if on-topic).

Task Achievement / Task Response RULES (strict):
- If topicRelevance is "off-topic": taskAchievement MUST be 3.0 or lower. Do NOT reward grammar/vocab by raising TA.
- If topicRelevance is "partially-related": taskAchievement MUST be 5.0 or lower.
- Good English on the WRONG topic still fails Task Achievement.
- Only raise TA when the answer clearly addresses the asked question.

Scoring rules:
- Use half-band scores ONLY: 0, 0.5, 1.0, 1.5, ... 9.0
- NEVER use values like 5.8, 6.2, 7.8 — only .0 or .5 decimals
- Criteria: Task Achievement (or Task Response for Task 2), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy
- Score CC / LR / GRA on the writing quality of the answer, but TA must follow relevance rules above
- overallBandScore = average of the 4 criteria, rounded to nearest 0.5
- Be fair and specific. Cite concrete examples from the student's text.
- Max 8 wordMistakes and 8 sentenceMistakes as { "wrong": "...", "correct": "..." }
- topPriorities: exactly 3 short English tips (if off-topic, tip #1 must say rewrite on the correct question)
- nextFocus: if off-topic or partially-related, criterion MUST be taskAchievement
- AiGenerateWriting: estimate AI-generated likelihood as "0%", "10%", ... "100%"
- AiMotivation: 1-2 short motivational sentences (English or simple Bangla)
- AiSuggestions: short English improvement tips (newline-separated ok)
- ReWriteImprovementVersion: rewrite a correct ON-TOPIC essay for the QUESTION (not an improved off-topic essay)
- Also fill legacy string fields ReWriteCorrectWords and ReWriteCorrectSentences using format: ❌ wrong ❌ → ✅ correct ✅ (one pair per line)
- generalFeedback: 2-4 English sentences; if off-topic, say clearly that the answer did not address the question
- Return JSON ONLY. No markdown. No commentary outside JSON.

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

Remember: if the answer is about a different topic than the question, set topicRelevance to "off-topic" and keep taskAchievement <= 3.0.`,
        },
      ],
      temperature: 0.3,
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

module.exports = {
  generateWritingResponse,
  sanitizeEvaluation,
  clampHalfBand,
  roundOverallBand,
  normalizeScoreBlock,
  normalizeSubmissionScores,
  buildSystemPrompt,
  CRITERION_KEYS,
};
