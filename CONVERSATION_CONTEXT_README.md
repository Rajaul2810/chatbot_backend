# Conversation Context Implementation

## Overview
The chat service now supports conversation context, allowing the chatbot to understand follow-up questions and maintain context throughout a conversation. **NEW**: The bot now prioritizes the **last mentioned course** when multiple courses are discussed.

## How It Works

### Backend Changes
1. **Modified `chatService.js`**: Now properly handles conversation history by including previous messages in the OpenAI API call
2. **Updated `chatController.js`**: Added validation for previousMessages format and debugging logs
3. **System Prompts**: Enhanced with contextual understanding instructions
4. **Added Test Endpoint**: `/api/chat/test-context` for testing conversation context
5. **Format Conversion**: Automatically converts frontend message formats to backend format
6. **Multiple Course Context**: Prioritizes the last mentioned course when multiple courses are discussed

### Frontend Implementation

#### Supported Data Formats
The `previousMessages` can be sent in either of these formats:

**Format 1 (Frontend Style):**
```javascript
const previousMessages = [
  {
    text: "Tell me about BBA course",
    sender: "user"
  },
  {
    text: "BBA (Bachelor of Business Administration) is a 4-year undergraduate program...",
    sender: "Mentors"
  },
  {
    text: "What's the price?",
    sender: "user"
  }
];
```

**Format 2 (Backend Style):**
```javascript
const previousMessages = [
  {
    role: "user",
    content: "Tell me about BBA course"
  },
  {
    role: "assistant", 
    content: "BBA (Bachelor of Business Administration) is a 4-year undergraduate program..."
  },
  {
    role: "user",
    content: "What's the price?"
  }
];
```

#### API Call Example
```javascript
const chatRequest = {
  message: "What's the schedule?",
  category: "Course & Mock Info",
  previousMessages: [
    {
      text: "Tell me about BBA course",
      sender: "user"
    },
    {
      text: "BBA (Bachelor of Business Administration) is a 4-year undergraduate program...",
      sender: "Mentors"
    },
    {
      text: "What's the price?",
      sender: "user"
    },
    {
      text: "The BBA course fee is 45,000 BDT per semester...",
      sender: "Mentors"
    }
  ]
};

fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(chatRequest)
});
```

## Conversation Examples

### Example 1: Single Course Information
```
User: "Tell me about BBA course"
Assistant: "BBA (Bachelor of Business Administration) is a 4-year undergraduate program that covers business fundamentals, management principles, and practical skills. It's perfect for students interested in business careers."

User: "What's the price?"
Assistant: "The BBA course fee is 45,000 BDT per semester. Total program cost is 360,000 BDT for 4 years (8 semesters)."

User: "When does the next batch start?"
Assistant: "The next BBA batch starts on January 15th, 2024. Classes are held Monday to Thursday from 6:00 PM to 8:00 PM."
```

### Example 2: Multiple Course Context (NEW FEATURE)
```
User: "Tell me about BBA course"
Assistant: "BBA course টির জন্য ৪ মাসের একটি কোর্স রয়েছে, যেখানে ৪০ টি ক্লাস থাকবে। প্রতিটি ক্লাসের দৈর্ঘ্য ২ ঘণ্টা। অনলাইনে এই কোর্সের মূল্য ১২,০৭৫ টাকা এবং অন-ক্যাম্পাসে ২০,৭০০ টাকা। 😊"

User: "What about MBA course?"
Assistant: "MBA course টি IBA, DU এর জন্য প্রস্তুতির জন্য ডিজাইন করা হয়েছে। ৪ মাসের কোর্সে ৪৩ টি ক্লাস রয়েছে, প্রতিটি ২ ঘণ্টা। অনলাইনে মূল্য ৮,০৭৫ টাকা এবং অন-ক্যাম্পাসে ১৬,০০০ টাকা। 😊"

User: "price koto?"
Assistant: "MBA course er price online ৮,০৭৫ টাকা ar on-campus ১৬,০০০ টাকা। 😊"
[Note: Refers to MBA since it was the last course discussed]
```

### Example 3: Study Abroad with Multiple Countries
```
User: "Tell me about studying in Canada"
Assistant: "Canada offers excellent education with affordable costs compared to other countries. Popular programs include Business, Engineering, and Computer Science."

User: "What about Australia?"
Assistant: "Australia provides world-class education with great post-study work opportunities. Popular programs include Business, IT, and Healthcare."

User: "What about the cost?"
Assistant: "For studying in Australia, you'll need approximately 25,000-35,000 AUD per year for tuition, plus 20,000-25,000 AUD for living expenses."
[Note: Refers to Australia since it was the last country discussed]
```

## Key Features

1. **Contextual Understanding**: The bot understands follow-up questions like "price?", "schedule?", "requirements?" based on previous conversation
2. **Message History**: Maintains up to 10 recent messages to prevent token overflow
3. **Validation**: Backend validates message format before processing
4. **Bilingual Support**: Works with both Bangla and English conversations
5. **Debug Logging**: Comprehensive logging to troubleshoot issues
6. **Format Flexibility**: Supports both frontend and backend message formats
7. **Multiple Course Priority**: Always refers to the last mentioned course when multiple courses are discussed

## Implementation Notes

- The system automatically limits conversation history to the last 10 messages
- Messages must have either `text`/`sender` or `role`/`content` properties
- The bot will provide contextual responses even for short follow-up questions
- Works across all categories (Course Info, Study Abroad, Technical Support, etc.)
- Automatically converts frontend format to backend format
- **NEW**: Prioritizes the most recently discussed course/country when multiple topics are mentioned

## Testing

### Manual Testing
To test the conversation context:

1. Send an initial question about a specific topic
2. Send follow-up questions like "price?", "schedule?", "requirements?"
3. Verify the bot maintains context and provides relevant information
4. Test with both English and Bangla/Banglish conversations

### Multiple Course Testing
To test multiple course context:

1. Ask about one course (e.g., "BBA course details")
2. Ask about another course (e.g., "What about MBA course?")
3. Ask a follow-up question (e.g., "price koto?")
4. Verify the bot refers to the last mentioned course (MBA in this case)

### Automated Testing
Use the test endpoints to verify conversation context:

```bash
# Test basic conversation context
GET /api/chat/test-context

# Test frontend format conversion
GET /api/chat/test-frontend-format

# Test multiple course context (NEW)
GET /api/chat/test-multiple-course
```

The multiple course test simulates:
- User: "BBA course details"
- Assistant: [Provides BBA course details]
- User: "What about MBA course?"
- Assistant: [Provides MBA course details]
- User: "price koto?"
- Expected: Should provide MBA course price specifically

## Troubleshooting

### Common Issues

1. **Bot asks "which course?" instead of providing context**
   - Check if `previousMessages` are being sent correctly
   - Verify message format (text/sender or role/content properties)
   - Check server logs for debugging information

2. **No conversation context maintained**
   - Ensure frontend is sending `previousMessages` array
   - Check if messages are in correct format
   - Verify the conversation history is being passed

3. **Bot refers to wrong course in multiple course scenario**
   - Ensure the conversation history includes all recent messages
   - Check that the last mentioned course is properly included in the context

4. **Debug Information**
   - Check server console logs for:
     - `=== CHAT REQUEST DEBUG ===`
     - `=== CONVERSATION CONTEXT DEBUG ===`
     - `=== FINAL MESSAGES TO OPENAI ===`

### Debug Steps

1. **Check Frontend**: Ensure `previousMessages` is being sent in the request
2. **Check Backend Logs**: Look for debug information in server console
3. **Test Endpoint**: Use `/api/chat/test-multiple-course` to verify functionality
4. **Message Format**: Ensure each message has either `text`/`sender` or `role`/`content` properties

### Expected Log Output
```
=== CHAT REQUEST DEBUG ===
Current message: price koto?
Category: Course & Mock Info
Previous messages count: 4
Previous messages: [
  {
    "text": "BBA course details",
    "sender": "user"
  },
  {
    "text": "BBA course টির জন্য ৪ মাসের একটি কোর্স রয়েছে...",
    "sender": "Mentors"
  },
  {
    "text": "What about MBA course?",
    "sender": "user"
  },
  {
    "text": "MBA course টি IBA, DU এর জন্য প্রস্তুতির জন্য ডিজাইন করা হয়েছে...",
    "sender": "Mentors"
  }
]
========================
Formatted messages count: 4
Formatted messages: [
  {
    "role": "user",
    "content": "BBA course details"
  },
  {
    "role": "assistant",
    "content": "BBA course টির জন্য ৪ মাসের একটি কোর্স রয়েছে..."
  },
  {
    "role": "user",
    "content": "What about MBA course?"
  },
  {
    "role": "assistant",
    "content": "MBA course টি IBA, DU এর জন্য প্রস্তুতির জন্য ডিজাইন করা হয়েছে..."
  }
]
=== CONVERSATION CONTEXT DEBUG ===
Adding previous messages to context:
1. user: BBA course details
2. assistant: BBA course টির জন্য ৪ মাসের একটি কোর্স রয়েছে...
3. user: What about MBA course?
4. assistant: MBA course টি IBA, DU এর জন্য প্রস্তুতির জন্য ডিজাইন করা হয়েছে...
==================================
=== FINAL MESSAGES TO OPENAI ===
Total messages: 6
Current user input: price koto?
===============================
```
