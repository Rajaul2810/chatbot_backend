const writingQuestions = require('../data/writingQuestions.json');

const getRandomWritingQuestion = () => {
  return writingQuestions[Math.floor(Math.random() * writingQuestions.length)];
};

module.exports = { getRandomWritingQuestion };
