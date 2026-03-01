const openai = require('../utils/openaiClient');
const courseModel = require('../models/courseModel');
const techModel = require('../models/techModel');
const batchModel = require('../models/batchModel');
const branchModel = require('../models/branchModel');
const studyAbroadModel = require('../models/studyAbroadModel');

async function getContextForCategory(category) {
  switch (category) {
    case 'Course & Mock Info':
      return await courseModel.getCoursesContext();
    case 'Batch Info':
      return await batchModel.getBatchContext();
    case 'Technical Info':
      return await techModel.getTechContext();
    case 'Study Abroad Info':
      return await studyAbroadModel.getStudyAbroadContext();
    default:
      return 'No relevant data found.';
  }
}

function buildIntentMessages(userInput, category, context, previousMessages) {
  const systemPrompt = `
  You are a structured AI assistant for an educational platform.
  
  You understand:
  - Bangla
  - English
  - Banglish (mixed Bangla written in English letters)
  
  Your responsibilities:
  
  1. Understand the user's language automatically.
  2. Answer questions strictly from the provided course data (context).
  3. Detect buying intent.
  4. Always return valid JSON only. Never return plain text.
  
  -------------------------------------
  INTENT DETECTION RULES
  -------------------------------------
  
  If user uses words like:
  buy, enroll, admission, join, register, price, fee, discount,
  "kivabe kinbo", "vorti", "admission nibo", "join korte chai",
  "course nibo", "koto taka", "offer ache?", "discount pabo?",
  or similar intent-related phrases
  
  → Then set intent = "buy_course"
  
  Otherwise:
  → intent = "general_query"
  
  -------------------------------------
  COURSE DETECTION RULES
  -------------------------------------
  
  Match course name exactly from this list (if mentioned):
  
  IELTS  
  GED  
  SAT  
  PTE  
  Junior English  
  Abacus  
  Kids English  
  Grammar Writing  
  Advanced Writing  
  Private University Admission  
  Spoken English  
  
  If no specific course is mentioned:
  → course = null
  
  -------------------------------------
  RESPONSE FORMAT (STRICT)
  -------------------------------------
  
  Always return JSON in this format:
  
  {
    "intent": "buy_course" | "general_query",
    "course": "IELTS" | "GED" | "SAT" | "PTE" | "Junior English" | "Abacus" | "Kids English" | "Grammar Writing" | "Advanced Writing" | "Private University Admission" | "Spoken English" | null,
    "language": "bangla" | "english" | "banglish",
    "answer": "Short helpful response based only on provided context.",
    "suggest_counselor_contact": true | false
  }
  
  Rules:
  - If intent = buy_course → suggest_counselor_contact = true
  - Otherwise → false
  - If answer not found in context → say politely that information is not available.
  - Never hallucinate.
  - Never return text outside JSON.
  
  -------------------------------------
  
  Category: ${category}
  
  Relevant Data:
  ${context}
  `;
  const messages = [{ role: 'system', content: systemPrompt }];
  if (previousMessages && previousMessages.length > 0) {
    const recent = previousMessages.slice(-10);
    recent.forEach(msg => {
      if (msg.role && msg.content) messages.push({ role: msg.role, content: msg.content });
    });
  }
  messages.push({ role: 'user', content: userInput });
  return messages;
}

const intentJsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'intent_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        intent: { type: 'string', enum: ['info', 'buy_course', 'general_question'] },
        course: { type: 'string' },
        confidence: { type: 'number' },
        ask_for_phone: { type: 'boolean' },
        reply: { type: 'string' }
      },
      required: ['intent', 'course', 'confidence', 'ask_for_phone', 'reply'],
      additionalProperties: false
    }
  }
};

async function detectIntent(userInput, category, previousMessages) {
  const context = await getContextForCategory(category);
  const messages = buildIntentMessages(userInput, category, context, previousMessages);
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    response_format: intentJsonSchema,
    temperature: 0.2
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return {
      intent: 'general_question',
      course: null,
      confidence: 0.5,
      ask_for_phone: false,
      reply: 'দুঃখিত, আবার চেষ্টা করুন।'
    };
  }
  try {
    const out = JSON.parse(content);
    if (out.course === '') out.course = null;
    return out;
  } catch {
    return {
      intent: 'general_question',
      course: null,
      confidence: 0.5,
      ask_for_phone: false,
      reply: content || 'দুঃখিত, আবার চেষ্টা করুন।'
    };
  }
}

module.exports = { detectIntent };
