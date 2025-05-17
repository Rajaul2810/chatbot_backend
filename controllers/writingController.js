const fs = require('fs');
const path = require('path');
const { generateWritingResponse } = require('../services/writingService');
const Submission = require('../models/writingModel');

// Function to get a random writing question
const getRandomWritingQuestion = () => {
  try {
    const questionsPath = path.join(__dirname, '..', 'data', 'writingQuestions.json');
    const questionsData = fs.readFileSync(questionsPath, 'utf-8');
    const questionsJson = JSON.parse(questionsData);
    
    const allTopics = [];
    questionsJson.levels.forEach(level => {
      level.topics.forEach(topic => {
        allTopics.push(topic);
      });
    });

    if (allTopics.length === 0) {
      throw new Error('No topics found in writingQuestions.json');
    }
    
    const randomIndex = Math.floor(Math.random() * allTopics.length);
    return allTopics[randomIndex];
  } catch (error) {
    console.error("Error getting random writing question:", error);
    // In a real app, you might want to throw an error or return a default question
    // For now, returning null or re-throwing to be handled by the caller
    throw new Error('Could not load writing questions.');
  }
};

const handleWriting = async (req, res) => {
  // Ensure mysqlUserId is present for ensureMongoUser middleware to create/find user
  const { message, question, taskType, mysqlUserId, name, email, phone } = req.body;
  const userId = req.mongoUser?._id; // ensureMongoUser middleware should have run and populated req.mongoUser

  if (!userId) {
    // This case should ideally be prevented by ensureMongoUser, 
    // or ensureMongoUser should be called here if not globally applied for this route.
    // For now, assuming ensureMongoUser is active on the route.
    return res.status(400).json({ error: 'User not authenticated or found. Ensure mysqlUserId, name, and email are provided if user is new.' });
  }

  if (!message || !question || !taskType) {
    return res.status(400).json({ error: 'Missing required fields: message, question, or taskType.' });
  }

  try {
    const evaluation = await generateWritingResponse(message, question);

    const submission = new Submission({
      userId: userId,
      taskType: taskType,
      topic: question,
      content: message,
      AiMotivation: evaluation.AiMotivation,
      AiSuggestions: evaluation.AiSuggestions,
      AiGenerateWriting: evaluation.AiGenerateWriting,
      score: {
        taskAchievement: evaluation.taskAchievement?.score,
        coherenceAndCohesion: evaluation.coherenceAndCohesion?.score,
        lexicalResource: evaluation.lexicalResource?.score,
        grammaticalRangeAndAccuracy: evaluation.grammaticalRangeAndAccuracy?.score,
        overallBandScore: evaluation.overallBandScore
      },
      feedback: evaluation.generalFeedback,
      detailedFeedback: {
        taskAchievement: evaluation.taskAchievement,
        coherenceAndCohesion: evaluation.coherenceAndCohesion,
        lexicalResource: evaluation.lexicalResource,
        grammaticalRangeAndAccuracy: evaluation.grammaticalRangeAndAccuracy
      },
      evaluator: 'AI',
      status: 'evaluated'
    });

    const savedSubmission = await submission.save();

    //update user
    


    res.status(201).json(savedSubmission);



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
    const question = getRandomWritingQuestion();
    if (!question) {
      // This case might not be reached if getRandomWritingQuestion throws,
      // but it's good for defensive programming.
      return res.status(404).json({ error: 'No writing questions available at the moment.' });
    }
    res.json({ question });
  } catch (error) {
    // Error is already logged by getRandomWritingQuestion
    res.status(500).json({ error: error.message || 'Failed to retrieve a writing question.' });
  }
};

module.exports = { handleWriting, handleWritingQuestion };
