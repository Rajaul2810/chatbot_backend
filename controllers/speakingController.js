const fs = require('fs');
const path = require('path');
const { generateSpeakingResponse } = require('../services/speakingService');
const SpeakingSubmission = require('../models/speakingModel');
const User = require('../models/User');

// Function to get the next writing question for a user
const getNextSpeakingQuestion = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const questionsPath = path.join(__dirname, '..', 'data', 'speakingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);

    //console.log(questionsJson);
    
    // Find current level using name instead of level code
    const currentLevel = questionsJson.levels.find(l => l.name === user.speakingLevel);
    if (!currentLevel) {
      throw new Error('Invalid level');
    }

    //console.log(currentLevel);

    // Get current question
    const currentQuestion = currentLevel.topics[user.speakingCurrentQuestionIndex];
    if (!currentQuestion) {
      throw new Error('No more questions in current level');
    }
    //console.log(currentQuestion);
    return {
      question: currentQuestion,
      speakingLevel: user.speakingLevel,
      questionNumber: user.speakingCurrentQuestionIndex + 1,
      totalQuestions: currentLevel.topics.length
    };
  } catch (error) {
    console.error("Error getting next speaking question:", error);
    throw error;
  }
};

const handleSpeaking = async (req, res) => {
  const { message, questionId, questionTitle, taskType, mysqlUserId, name, email, phone } = req.body;
  const userId = req.mongoUser?._id;

  if (!userId) {
    return res.status(400).json({ error: 'User not authenticated or found.' });
  }

    if (!message || !questionId || !taskType) {
    return res.status(400).json({ error: 'Missing required fields: message, questionId, or taskType.' });
  }

  try {
    // Check daily submission limit
    const canSubmit = await SpeakingSubmission.checkDailyLimit(userId);
    if (!canSubmit) {
      return res.status(429).json({ 
        error: 'Daily submission limit reached. You can submit up to 2 speakings per day.',
        limitReached: true
      });
    }

    const evaluation = await generateSpeakingResponse(message, questionId);
    const overallScore = evaluation.overallBandScore;

    const submission = new SpeakingSubmission({
      userId: userId,
      questionId: questionId,
      taskType: taskType,
      topic: questionTitle,
      content: message,
      AiMotivation: evaluation.AiMotivation,
      AiSuggestions: evaluation.AiSuggestions,
      AiGenerateSpeaking: evaluation.AiGenerateSpeaking,
      ReWriteImprovementVersion: evaluation.ReWriteImprovementVersion,
      TotalGrammerError: evaluation.TotalGrammerError,
      TotalVocabularyError: evaluation.TotalVocabularyError,
      TotalSentenceError: evaluation.TotalSentenceError,
      ReWriteCorrectWords: evaluation.ReWriteCorrectWords,
      ReWriteCorrectSentences: evaluation.ReWriteCorrectSentences,
      score: {
        fluencyAndCoherence: evaluation.fluencyAndCoherence?.score,
        lexicalResource: evaluation.lexicalResource?.score,
        grammaticalRangeAndAccuracy: evaluation.grammaticalRangeAndAccuracy?.score,
        pronunciation: evaluation.pronunciation?.score,
        overallBandScore: evaluation.overallBandScore
      },
      feedback: evaluation.generalFeedback,
      detailedFeedback: {
        fluencyAndCoherence: evaluation.fluencyAndCoherence,
        lexicalResource: evaluation.lexicalResource,
        grammaticalRangeAndAccuracy: evaluation.grammaticalRangeAndAccuracy,
        pronunciation: evaluation.pronunciation
      },
      evaluator: 'AI',
      status: 'evaluated',
      submissionDate: new Date()
    });

    const savedSubmission = await submission.save();

    // Update user progress
    const user = await User.findById(userId);
    
    // Add to completed questions if score is 7 or above
    if (overallScore >= 7) {
      user.speakingCompletedQuestions.push({
        questionId: questionId,
        score: overallScore,
        completedAt: new Date()
      });
    }

    // Always move to next question
    const questionsPath = path.join(__dirname, '..', 'data', 'speakingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);
    
    const currentLevel = questionsJson.levels.find(l => l.name === user.speakingLevel);
    
    // If completed all questions in current level, move to next level
    if (user.speakingCurrentQuestionIndex + 1 >= currentLevel.topics.length) {
      const currentLevelIndex = questionsJson.levels.findIndex(l => l.name === user.speakingLevel);
      if (currentLevelIndex < questionsJson.levels.length - 1) {
        user.speakingLevel = questionsJson.levels[currentLevelIndex + 1].name;
        user.speakingCurrentQuestionIndex = 0;
      }
    } else {
      user.speakingCurrentQuestionIndex += 1;
    }

    // Update user stats
    user.speakingTotalSubmissions += 1;
    user.speakingLastSubmissionDate = new Date();
    user.speakingAverageScore = Math.round(((user.speakingAverageScore * (user.speakingTotalSubmissions - 1) + overallScore) / user.speakingTotalSubmissions) * 100) / 100;
    
    await user.save();

    res.status(201).json({
      submission: savedSubmission,
      progress: {
        speakingLevel: user.speakingLevel,
        speakingCurrentQuestionIndex: user.speakingCurrentQuestionIndex,
        speakingAverageScore: user.speakingAverageScore,
        speakingCompletedQuestions: user.speakingCompletedQuestions.length
      }
    });

  } catch (error) {
    console.error("Error in handleSpeaking:", error);
    if (error.message === "Failed to get evaluation from AI service." || error.message === "Failed to parse evaluation data from AI service.") {
      res.status(502).json({ error: `Evaluation service error: ${error.message}` });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred while processing your speaking submission.' });
    }
  }
};

const handleSpeakingQuestion = async (req, res) => {
  try {
    const userId = req.mongoUser?._id;
    if (!userId) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    const questionData = await getNextSpeakingQuestion(userId);
    res.json(questionData);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to retrieve a speaking question.' });
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

    // Get level information
    const questionsPath = path.join(__dirname, '..', 'data', 'speakingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);
    
    const currentLevel = questionsJson.levels.find(l => l.name === user.speakingLevel);
    const currentQuestion = currentLevel?.topics[user.speakingCurrentQuestionIndex];

    // Get today's submission count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dailySubmissions = await SpeakingSubmission.countDocuments({
      userId: userId,
      submissionDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    res.json({
      speakingLevel: user.speakingLevel,
      currentQuestion: currentQuestion,
      questionNumber: user.speakingCurrentQuestionIndex + 1,
      totalQuestions: currentLevel?.topics.length || 0,
      speakingCompletedQuestions: user.speakingCompletedQuestions.length,
      speakingAverageScore: user.speakingAverageScore,
      speakingTotalSubmissions: user.speakingTotalSubmissions,
      speakingLastSubmissionDate: user.speakingLastSubmissionDate,
      dailySubmissions: dailySubmissions,
      canSubmitMore: dailySubmissions < 2
    });
  } catch (error) {
    console.error("Error getting user progress:", error);
    res.status(500).json({ error: 'Failed to retrieve user progress.' });
  }
};

module.exports = { handleSpeaking, handleSpeakingQuestion, getUserProgress };
