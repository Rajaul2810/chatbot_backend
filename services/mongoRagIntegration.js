const mongoRagService = require('./mongoRagService');
const openai = require('../utils/openaiClient');

class MongoRAGIntegration {
  constructor() {
    this.openai = openai;
  }

  // Enhanced chat response with RAG
  async generateEnhancedResponse(userInput, category, previousMessages, useRAG = true) {
    try {
      let context = '';
      let ragContext = '';

      // Get existing context from models
      switch (category) {
        case 'Course & Mock Info':
          context = await this.getCourseContext();
          break;
        case 'Batch Info':
          context = await this.getBatchContext();
          break;
        case 'Technical Info':
          context = await this.getTechContext();
          break;
        case 'Study Abroad Info':
          context = await this.getStudyAbroadContext();
          break;
        default:
          context = 'No relevant data found.';
      }

      // Get RAG context if enabled
      if (useRAG) {
        try {
          const ragResult = await mongoRagService.searchContext(userInput, null, 3);
          if (ragResult.context && ragResult.score > 0.7) {
            ragContext = `\n\nAdditional Information:\n${ragResult.context}`;
            console.log(`RAG found relevant context with score: ${ragResult.score}`);
          }
        } catch (ragError) {
          console.warn('RAG search failed, continuing without RAG:', ragError.message);
        }
      }

      // Combine contexts
      const fullContext = context + ragContext;

      // Prepare conversation messages
      const messages = this.prepareMessages(userInput, category, previousMessages, fullContext);

      // Generate response
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      return {
        response: response.choices[0].message.content,
        usedRAG: useRAG && ragContext.length > 0,
        ragScore: ragContext.length > 0 ? 'high' : 'none'
      };

    } catch (error) {
      console.error('Error generating enhanced response:', error);
      throw error;
    }
  }

  // Prepare messages for OpenAI
  prepareMessages(userInput, category, previousMessages, context) {
    const messages = [];
    
    // Add system prompt
    const systemPrompt = this.getSystemPrompt(category);
    messages.push({
      role: "system",
      content: systemPrompt + `\n\nContext Information:\n${context}`
    });

    // Add previous messages for context
    if (previousMessages && previousMessages.length > 0) {
      messages.push(...previousMessages.slice(-5)); // Last 5 messages for context
    }

    // Add current user input
    messages.push({
      role: "user",
      content: userInput
    });

    return messages;
  }

  // Get system prompt based on category
  getSystemPrompt(category) {
    const basePrompt = `
You are a smart and friendly chatbot named Mentors' Assistant, helping students of Mentors'/ Mentors Learning. You understand and respond in both Bangla and Banglish (Bangla-English mixed) naturally.

Core Responsibilities:
1. Course Information:
   - Provide detailed course details, fees, and schedules
   - Suggest relevant courses based on student needs
   - Explain course benefits and career prospects

2. Branch Information:
   - Share branch locations, contact details, and facilities
   - Help find nearest branches
   - Provide branch-specific information

3. Batch Information:
   - Share current and upcoming batch schedules
   - Explain batch timings and durations
   - Help with batch selection

4. Mock Tests:
   - Provide mock test schedules and registration details
   - Explain test formats and preparation tips
   - Share test results and analysis

5. Technical Support:
   - Help with online platform issues
   - Guide through registration processes
   - Assist with payment-related queries

CRITICAL: You MUST maintain conversation context at all times. When a user asks follow-up questions, you MUST refer to the previously discussed topic/course.

MULTIPLE COURSE CONTEXT RULES:
- If multiple courses are discussed in the conversation, ALWAYS refer to the LAST mentioned course
- When user asks follow-up questions like "price?", "schedule?", etc., provide information about the MOST RECENT course discussed
- The last course mentioned in the conversation takes priority over earlier courses

Context Rules:
- If user asks "price?" or "price koto?" after discussing a course, provide that specific course's price
- If user asks "schedule?" or "batch?" after discussing a course, provide that specific course's schedule
- If user asks "requirements?" or "requirements ki?" after discussing a course, provide that specific course's requirements
- NEVER ask "which course?" if the course was just discussed in the conversation
- ALWAYS assume the user is referring to the most recently discussed topic

Communication Style:
- Keep responses concise (under 100 words when possible)
- Use friendly, encouraging tone
- Provide examples when explaining concepts
- Include relevant links and resources
- Use emojis appropriately for better engagement
- Maintain professional yet approachable language
`;

    return basePrompt;
  }

  // Get context from existing models (placeholder implementations)
  async getCourseContext() {
    // This would integrate with your existing courseModel
    return 'Course information context...';
  }

  async getBatchContext() {
    // This would integrate with your existing batchModel
    return 'Batch information context...';
  }

  async getTechContext() {
    // This would integrate with your existing techModel
    return 'Technical information context...';
  }

  async getStudyAbroadContext() {
    // This would integrate with your existing studyAbroadModel
    return 'Study abroad information context...';
  }

  // Search specific category with RAG
  async searchCategory(query, category, topK = 5) {
    try {
      const result = await mongoRagService.searchContext(query, category, topK);
      return result;
    } catch (error) {
      console.error('Error searching category:', error);
      return { context: '', matches: [], score: 0 };
    }
  }

  // Get course-specific information using RAG
  async getCourseInfo(courseName) {
    try {
      const query = `${courseName} course details fees schedule`;
      const result = await mongoRagService.searchContext(query, null, 3);
      return result;
    } catch (error) {
      console.error('Error getting course info:', error);
      return { context: '', matches: [], score: 0 };
    }
  }

  // Get branch information using RAG
  async getBranchInfo(branchName) {
    try {
      const query = `${branchName} branch location contact`;
      const result = await mongoRagService.searchContext(query, null, 2);
      return result;
    } catch (error) {
      console.error('Error getting branch info:', error);
      return { context: '', matches: [], score: 0 };
    }
  }
}

module.exports = new MongoRAGIntegration();
