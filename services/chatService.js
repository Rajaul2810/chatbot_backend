const openai = require('../utils/openaiClient');
const courseModel = require('../models/courseModel');
const techModel = require('../models/techModel');
const batchModel = require('../models/batchModel');
const branchModel = require('../models/branchModel');

const generateChatResponse = async (userInput, category) => {
 
  let context = '';

  switch (category) {
    case 'Course & Mock Info':
      context = await courseModel.getCoursesContext();
      break;
    case 'Batch Info':
      context = await batchModel.getBatchContext();
      break;
    case 'Technical Info':
      context = await techModel.getTechContext();
      break;
    case 'Branch Info':
      context = await branchModel.getBranchContext();
      break;
    default:
      context = 'No relevant data found.';
  }

  const systemPrompt = `
You are a smart and friendly chatbot helping students of Mentors'/ Mentors Learning.
You understand Banglish (Bangla-English mixed) and answer like a human mentor.

Always try to help with course info, batch info, mock test info, branch info, or technical issues.
Give short and helpful answers use examples when needed.

Category: ${category}
Relevant Data:\n${context}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ],
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
};

module.exports = { generateChatResponse };
