const { generateWritingResponse } = require('../services/writingService');
const { getRandomWritingQuestion } = require('../models/writingModel');
const handleWriting = async (req, res) => {
  const { message, question } = req.body;

  try {
    const response = await generateWritingResponse(message, question);
    res.json({ response });
  } catch (error) {
    console.error("Writing error:", error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const handleWritingQuestion = async (req, res) => {
  const question = getRandomWritingQuestion();
  res.json({ question });
};

module.exports = { handleWriting, handleWritingQuestion };
