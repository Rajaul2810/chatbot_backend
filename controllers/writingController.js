const fs = require('fs');
const path = require('path');
const { generateWritingResponse } = require('../services/writingService');
const Submission = require('../models/writingModel');
const User = require('../models/User');

// Function to get the next writing question for a user
const getNextWritingQuestion = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const questionsPath = path.join(__dirname, '..', 'data', 'writingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);

    //console.log(questionsJson);
    
    // Find current level using name instead of level code
    const currentLevel = questionsJson.levels.find(l => l.name === user.writingLevel);
    if (!currentLevel) {
      throw new Error('Invalid level');
    }

    //console.log(currentLevel);

    // Get current question
    const currentQuestion = currentLevel.topics[user.currentQuestionIndex];
    if (!currentQuestion) {
      throw new Error('No more questions in current level');
    }
    //console.log(currentQuestion);
    return {
      question: currentQuestion,
      writingLevel: user.writingLevel,
      questionNumber: user.currentQuestionIndex + 1,
      totalQuestions: currentLevel.topics.length
    };
  } catch (error) {
    console.error("Error getting next writing question:", error);
    throw error;
  }
};

const handleWriting = async (req, res) => {
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
    const canSubmit = await Submission.checkDailyLimit(userId);
    if (!canSubmit) {
      return res.status(429).json({ 
        error: 'Daily submission limit reached. You can submit up to 2 writings per day.',
        limitReached: true
      });
    }

    const evaluation = await generateWritingResponse(message, questionId);
    const overallScore = evaluation.overallBandScore;

    const submission = new Submission({
      userId: userId,
      questionId: questionId,
      taskType: taskType,
      topic: questionTitle,
      content: message,
      AiMotivation: evaluation.AiMotivation,
      AiSuggestions: evaluation.AiSuggestions,
      AiGenerateWriting: evaluation.AiGenerateWriting,
      ReWriteImprovementVersion: evaluation.ReWriteImprovementVersion,
      TotalGrammerError: evaluation.TotalGrammerError,
      TotalVocabularyError: evaluation.TotalVocabularyError,
      TotalSentenceError: evaluation.TotalSentenceError,
      ReWriteCorrectWords: evaluation.ReWriteCorrectWords,
      ReWriteCorrectSentences: evaluation.ReWriteCorrectSentences,
      score: {
        taskAchievement: evaluation.taskAchievement?.score,
        coherenceAndCohesion: evaluation.coherenceAndCohesion?.score,
        lexicalResource: evaluation.lexicalResource?.score,
        grammaticalRangeAndAccuracy: evaluation.grammaticalRangeAndAccuracy?.score,
        overallBandScore: overallScore
      },
      feedback: evaluation.generalFeedback,
      detailedFeedback: {
        taskAchievement: evaluation.taskAchievement,
        coherenceAndCohesion: evaluation.coherenceAndCohesion,
        lexicalResource: evaluation.lexicalResource,
        grammaticalRangeAndAccuracy: evaluation.grammaticalRangeAndAccuracy
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
      user.completedQuestions.push({
        questionId: questionId,
        score: overallScore,
        completedAt: new Date()
      });
    }

    // Always move to next question
    const questionsPath = path.join(__dirname, '..', 'data', 'writingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);
    
    const currentLevel = questionsJson.levels.find(l => l.name === user.writingLevel);
    
    // If completed all questions in current level, move to next level
    if (user.currentQuestionIndex + 1 >= currentLevel.topics.length) {
      const currentLevelIndex = questionsJson.levels.findIndex(l => l.name === user.writingLevel);
      if (currentLevelIndex < questionsJson.levels.length - 1) {
        user.writingLevel = questionsJson.levels[currentLevelIndex + 1].name;
        user.currentQuestionIndex = 0;
      }
    } else {
      user.currentQuestionIndex += 1;
    }

    // Update user stats
    user.totalSubmissions += 1;
    user.lastSubmissionDate = new Date();
    user.averageScore = Math.round(((user.averageScore * (user.totalSubmissions - 1) + overallScore) / user.totalSubmissions) * 100) / 100;
    
    await user.save();

    res.status(201).json({
      submission: savedSubmission,
      progress: {
        writingLevel: user.writingLevel,
        currentQuestionIndex: user.currentQuestionIndex,
        averageScore: user.averageScore,
        completedQuestions: user.completedQuestions.length
      }
    });

  } catch (error) {
    console.error("Error in handleWriting:", error);
    if (error.message === "Failed to get evaluation from AI service." || error.message === "Failed to parse evaluation data from AI service.") {
      res.status(502).json({ error: `Evaluation service error: ${error.message}` });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred while processing your writing submission.' });
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
  console.log("getUserProgress", req.body);
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
    const questionsPath = path.join(__dirname, '..', 'data', 'writingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);
    
    const currentLevel = questionsJson.levels.find(l => l.name === user.writingLevel);
    const currentQuestion = currentLevel?.topics[user.currentQuestionIndex];

    // Get today's submission count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dailySubmissions = await Submission.countDocuments({
      userId: userId,
      submissionDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    res.json({
      writingLevel: user.writingLevel,
      currentQuestion: currentQuestion,
      questionNumber: user.currentQuestionIndex + 1,
      totalQuestions: currentLevel?.topics.length || 0,
      completedQuestions: user.completedQuestions.length,
      averageScore: user.averageScore,
      totalSubmissions: user.totalSubmissions,
      lastSubmissionDate: user.lastSubmissionDate,
      dailySubmissions: dailySubmissions,
      canSubmitMore: dailySubmissions < 2
    });
  } catch (error) {
    console.error("Error getting user progress:", error);
    res.status(500).json({ error: 'Failed to retrieve user progress.' });
  }
};

module.exports = { handleWriting, handleWritingQuestion, getUserProgress };
