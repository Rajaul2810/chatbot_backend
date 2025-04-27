const openai = require('../utils/openaiClient');

const generateWritingResponse = async (userInput, question) => {
    const systemPrompt = `You are an IELTS Writing examiner.

Evaluate the student's writing based on IELTS Band Descriptors:
- Task Achievement (TA)
- Coherence and Cohesion (CC)
- Lexical Resource (LR)
- Grammatical Range and Accuracy (GRA)

For each criterion, provide:
- Score (decimal format, between 1.0 and 9.0)
- Strengths (list of strong points)
- Improvements (list of suggestions)
- Examples (if needed, for vocabulary or cohesion words)
- Short paragraph feedback

Output the entire response ONLY in the following strict JSON format:
{
  "taskAchievement": {
    "score": 0,
    "strengths": [],
    "improvements": [],
    "feedback": ""
  },
  "coherenceAndCohesion": {
    "score": 0,
    "strengths": [],
    "examples": [],
    "feedback": ""
  },
  "lexicalResource": {
    "score": 0,
    "strengths": [],
    "examples": [],
    "improvements": [],
    "feedback": ""
  },
  "grammaticalRangeAndAccuracy": {
    "score": 0,
    "strengths": [],
    "improvements": [],
    "feedback": ""
  },
  "overallBandScore": 0,
  "generalFeedback": ""
}


Student's Writing:
${userInput}

Question:
${question}
    `;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', //gpt-4o-mini //gpt-4o //gpt-3.5-turbo
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput }
        ],
        temperature: 0.7,
    });

    return completion.choices[0].message.content;
};

module.exports = { generateWritingResponse };


