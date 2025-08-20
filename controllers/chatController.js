const { generateChatResponse } = require('../services/chatService');

const handleChat = async (req, res) => {
  const { message, category, previousMessages } = req.body;

  
  try {
    // Validate and format previousMessages if needed
    let formattedPreviousMessages = [];
    
    if (previousMessages && Array.isArray(previousMessages)) {
      // Convert frontend format (text/sender) to backend format (role/content)
      formattedPreviousMessages = previousMessages
        .filter(msg => msg && typeof msg === 'object')
        .map(msg => {
          // Handle frontend format: { text: "...", sender: "..." }
          if (msg.text && msg.sender) {
            return {
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            };
          }
          // Handle backend format: { role: "...", content: "..." }
          else if (msg.role && msg.content) {
            return msg;
          }
          return null;
        })
        .filter(msg => msg !== null);
      
     
    }
    
    const response = await generateChatResponse(message, category, formattedPreviousMessages);
    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Test endpoint for conversation context
const testConversationContext = async (req, res) => {
  try {
    // Simulate the conversation you mentioned
    const testPreviousMessages = [
      {
        role: "user",
        content: "MBA course details"
      },
      {
        role: "assistant",
        content: "The MBA course is designed for those preparing for IBA, DU. It includes 43 classes over 4 months, each lasting 2 hours. The course price is BDT 16,000 on-campus and BDT 8,075 online. It includes 5 important books and 5 mock tests. To enroll, you can call or visit a Mentors branch, or visit [Mentors Learning](https://mentorslearning.com) for online registration. 😊"
      }
    ];

    const response = await generateChatResponse("price koto?", "Course & Mock Info", testPreviousMessages);
    
    res.json({ 
      test: "Conversation Context Test",
      userInput: "price koto?",
      previousMessages: testPreviousMessages,
      response: response
    });
  } catch (error) {
    console.error("Test error:", error);
    res.status(500).json({ error: 'Test failed' });
  }
};

// Test endpoint for frontend format conversion
const testFrontendFormat = async (req, res) => {
  try {
    // Simulate the frontend format that was causing issues
    const testPreviousMessages = [
      {
        text: "BBA course details",
        sender: "user"
      },
      {
        text: "BBA course টির জন্য ৪ মাসের একটি কোর্স রয়েছে, যেখানে ৪০ টি ক্লাস থাকবে। প্রতিটি ক্লাসের দৈর্ঘ্য ২ ঘণ্টা। অনলাইনে এই কোর্সের মূল্য ১২,০৭৫ টাকা এবং অন-ক্যাম্পাসে ২০,৭০০ টাকা। এই কোর্সের মধ্যে ইংরেজি, গণিত, বিশ্লেষণাত্মক এবং সাধারন জ্ঞানের লাইভ ক্লাস অন্তর্ভুক্ত রয়েছে। ১৫ টি মক টেস্টও অন্তর্ভুক্ত রয়েছে। কোর্সের বিস্তারিত জানার জন্য নিকটস্থ Mentors' শাখায় যোগাযোগ করুন বা অনলাইনে ভিজিট করুন। 😊",
        sender: "Mentors"
      }
    ];

    const response = await generateChatResponse("price?", "Course & Mock Info", testPreviousMessages);
    
    res.json({ 
      test: "Frontend Format Test",
      userInput: "price?",
      previousMessages: testPreviousMessages,
      response: response
    });
  } catch (error) {
    console.error("Frontend format test error:", error);
    res.status(500).json({ error: 'Frontend format test failed' });
  }
};

module.exports = { handleChat, testConversationContext, testFrontendFormat };
