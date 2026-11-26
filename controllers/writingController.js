const fs = require('fs');
const path = require('path');
const {
  generateWritingResponse,
  generateBandSamples,
  clampHalfBand,
  roundOverallBand,
  normalizeScoreBlock,
  normalizeSubmissionScores,
  CRITERION_KEYS,
} = require('../services/writingService');
const { extractHandwritingText } = require('../services/writingOcrService');
const Submission = require('../models/writingModel');
const User = require('../models/User');

const getNextWritingQuestion = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const questionsPath = path.join(__dirname, '..', 'data', 'writingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);

    const currentLevel = questionsJson.levels.find((l) => l.name === user.writingLevel);
    if (!currentLevel) {
      throw new Error('Invalid level');
    }

    const currentQuestion = currentLevel.topics[user.currentQuestionIndex];
    if (!currentQuestion) {
      throw new Error('No more questions in current level');
    }

    return {
      question: currentQuestion,
      writingLevel: user.writingLevel,
      questionNumber: user.currentQuestionIndex + 1,
      totalQuestions: currentLevel.topics.length,
    };
  } catch (error) {
    console.error('Error getting next writing question:', error);
    throw error;
  }
};

const summarizeSubmission = (doc) => {
  const score = normalizeScoreBlock(doc.score || {});
  let weakestCriterion = 'taskAchievement';
  let weakestScore = 9;
  for (const key of CRITERION_KEYS) {
    const value = score[key];
    if (value < weakestScore) {
      weakestScore = value;
      weakestCriterion = key;
    }
  }

  return {
    id: doc._id,
    topic: doc.topic,
    question: doc.topic,
    taskType: doc.taskType,
    submissionDate: doc.submissionDate || doc.createdAt,
    score,
    topicRelevance: doc.topicRelevance || 'on-topic',
    nextFocus: doc.nextFocus || null,
    weakestCriterion,
  };
};

const handleWriting = async (req, res) => {
  const { message, questionId, questionTitle, taskType } = req.body;
  const userId = req.mongoUser?._id;

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated or found.' });
  }

  if (!message || !questionId || !taskType) {
    return res.status(400).json({
      error: 'Missing required fields: message, questionId, or taskType.',
    });
  }

  try {
    const canSubmit = await Submission.checkDailyLimit(userId);
    if (!canSubmit) {
      return res.status(429).json({
        error: 'Daily submission limit reached. You can submit up to 2 writings per day.',
        limitReached: true,
      });
    }

    const questionText = questionTitle || String(questionId);
    const evaluation = await generateWritingResponse(message, questionText, taskType);
    const score = normalizeScoreBlock({
      ...evaluation.score,
      overallBandScore: evaluation.overallBandScore,
    });
    const overallScore = score.overallBandScore;

    // Full-band ladder samples (e.g. user 6 -> 7,8,9). Never fail the submission.
    let bandSamples = [];
    try {
      bandSamples = await generateBandSamples({
        question: questionText,
        userInput: message,
        userBand: overallScore,
        taskType,
      });
    } catch (sampleErr) {
      console.error('Band sample generation failed:', sampleErr);
      bandSamples = [];
    }

    const questionForStore = questionTitle || questionText;
    const submission = new Submission({
      userId,
      questionId,
      taskType,
      topic: questionForStore,
      content: message,
      topicRelevance: evaluation.topicRelevance || 'on-topic',
      topicMismatchReason: evaluation.topicMismatchReason || '',
      AiMotivation: evaluation.AiMotivation,
      AiSuggestions: evaluation.AiSuggestions,
      AiGenerateWriting: evaluation.AiGenerateWriting,
      ReWriteImprovementVersion: evaluation.ReWriteImprovementVersion,
      TotalGrammerError: evaluation.TotalGrammerError,
      TotalVocabularyError: evaluation.TotalVocabularyError,
      TotalSentenceError: evaluation.TotalSentenceError,
      ReWriteCorrectWords: evaluation.ReWriteCorrectWords,
      ReWriteCorrectSentences: evaluation.ReWriteCorrectSentences,
      wordMistakes: evaluation.wordMistakes || [],
      sentenceMistakes: evaluation.sentenceMistakes || [],
      topPriorities: evaluation.topPriorities || [],
      nextFocus: evaluation.nextFocus || {},
      bandSamples,
      score,
      feedback: evaluation.generalFeedback,
      detailedFeedback: evaluation.detailedFeedback,
      evaluator: 'AI',
      status: 'evaluated',
      submissionDate: new Date(),
      isAIWriting: Number(String(evaluation.AiGenerateWriting).replace('%', '')) > 10,
    });

    const savedSubmission = await submission.save();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (overallScore >= 7) {
      user.completedQuestions.push({
        questionId,
        score: overallScore,
        completedAt: new Date(),
      });
    }

    const questionsPath = path.join(__dirname, '..', 'data', 'writingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);
    const currentLevel = questionsJson.levels.find((l) => l.name === user.writingLevel);

    if (currentLevel) {
      if (user.currentQuestionIndex + 1 >= currentLevel.topics.length) {
        const currentLevelIndex = questionsJson.levels.findIndex(
          (l) => l.name === user.writingLevel
        );
        if (currentLevelIndex < questionsJson.levels.length - 1) {
          user.writingLevel = questionsJson.levels[currentLevelIndex + 1].name;
          user.currentQuestionIndex = 0;
        }
      } else {
        user.currentQuestionIndex += 1;
      }
    }

    user.totalSubmissions += 1;
    user.lastSubmissionDate = new Date();
    user.averageScore = roundOverallBand(
      (clampHalfBand(user.averageScore) * (user.totalSubmissions - 1) + overallScore) /
        user.totalSubmissions
    );

    await user.save();

    const submissionPayload = normalizeSubmissionScores(savedSubmission.toObject());
    res.status(201).json({
      submission: {
        ...submissionPayload,
        question: submissionPayload.topic,
        answer: submissionPayload.content,
      },
      question: questionForStore,
      answer: message,
      topicRelevance: evaluation.topicRelevance,
      progress: {
        writingLevel: user.writingLevel,
        currentQuestionIndex: user.currentQuestionIndex,
        averageScore: user.averageScore,
        completedQuestions: user.completedQuestions.length,
      },
    });
  } catch (error) {
    console.error('Error in handleWriting:', error);
    if (
      error.message === 'Failed to get evaluation from AI service.' ||
      error.message === 'Failed to parse evaluation data from AI service.' ||
      error.message === 'OpenAI returned empty content.'
    ) {
      res.status(502).json({ error: `Evaluation service error: ${error.message}` });
    } else {
      res.status(500).json({
        error: 'An unexpected error occurred while processing your writing submission.',
      });
    }
  }
};

const handleWritingQuestion = async (req, res) => {
  try {
    const userId = req.mongoUser?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const questionData = await getNextWritingQuestion(userId);
    res.json(questionData);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to retrieve a writing question.' });
  }
};

const getUserProgress = async (req, res) => {
  try {
    const userId = req.mongoUser?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const questionsPath = path.join(__dirname, '..', 'data', 'writingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);

    const currentLevel = questionsJson.levels.find((l) => l.name === user.writingLevel);
    const currentQuestion = currentLevel?.topics[user.currentQuestionIndex];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailySubmissions = await Submission.countDocuments({
      userId,
      submissionDate: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    const recentDocs = await Submission.find({ userId })
      .sort({ submissionDate: -1 })
      .limit(5)
      .select('score submissionDate topic nextFocus')
      .lean();

    const recentScores = recentDocs.map((doc) => {
      const score = normalizeScoreBlock(doc.score || {});
      return {
        date: doc.submissionDate,
        topic: doc.topic,
        overall: score.overallBandScore,
        taskAchievement: score.taskAchievement,
        coherenceAndCohesion: score.coherenceAndCohesion,
        lexicalResource: score.lexicalResource,
        grammaticalRangeAndAccuracy: score.grammaticalRangeAndAccuracy,
        nextFocus: doc.nextFocus || null,
      };
    });

    const criterionAverages = {
      taskAchievement: 0,
      coherenceAndCohesion: 0,
      lexicalResource: 0,
      grammaticalRangeAndAccuracy: 0,
    };

    if (recentScores.length) {
      for (const key of CRITERION_KEYS) {
        const sum = recentScores.reduce((acc, row) => acc + Number(row[key] || 0), 0);
        criterionAverages[key] = roundOverallBand(sum / recentScores.length);
      }
    }

    res.json({
      writingLevel: user.writingLevel,
      currentQuestion,
      questionNumber: user.currentQuestionIndex + 1,
      totalQuestions: currentLevel?.topics.length || 0,
      completedQuestions: user.completedQuestions.length,
      averageScore: clampHalfBand(user.averageScore),
      totalSubmissions: user.totalSubmissions,
      lastSubmissionDate: user.lastSubmissionDate,
      dailySubmissions,
      canSubmitMore: dailySubmissions < 2,
      recentScores,
      criterionAverages,
    });
  } catch (error) {
    console.error('Error getting user progress:', error);
    res.status(500).json({ error: 'Failed to retrieve user progress.' });
  }
};

const getWritingHistory = async (req, res) => {
  try {
    const userId = req.mongoUser?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const limit = Math.min(Number(req.body?.limit) || 10, 20);
    const docs = await Submission.find({ userId })
      .sort({ submissionDate: -1 })
      .limit(limit)
      .select('topic taskType score nextFocus topicRelevance submissionDate createdAt')
      .lean();

    res.json({
      submissions: docs.map(summarizeSubmission),
    });
  } catch (error) {
    console.error('Error getting writing history:', error);
    res.status(500).json({ error: 'Failed to retrieve writing history.' });
  }
};

const getWritingHistoryById = async (req, res) => {
  try {
    const userId = req.mongoUser?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Submission id is required' });
    }

    const submission = await Submission.findOne({ _id: id, userId }).lean();
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const normalized = normalizeSubmissionScores(submission);
    res.json({
      submission: {
        ...normalized,
        question: normalized.topic,
        answer: normalized.content,
      },
    });
  } catch (error) {
    console.error('Error getting writing history by id:', error);
    res.status(500).json({ error: 'Failed to retrieve submission.' });
  }
};

const handleWritingOcr = async (req, res) => {
  try {
    const userId = req.mongoUser?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const result = await extractHandwritingText(imageBase64, mimeType);
    // Image is not stored — only extracted text is returned
    res.json({
      text: result.text,
      wordCount: result.wordCount,
      stored: false,
    });
  } catch (error) {
    console.error('Error in handleWritingOcr:', error);
    const message = error.message || 'Failed to extract text from image.';
    const status =
      message.includes('required') ||
      message.includes('Invalid') ||
      message.includes('Only JPG') ||
      message.includes('too large')
        ? 400
        : 502;
    res.status(status).json({ error: message });
  }
};

module.exports = {
  handleWriting,
  handleWritingQuestion,
  getUserProgress,
  getWritingHistory,
  getWritingHistoryById,
  handleWritingOcr,
};
