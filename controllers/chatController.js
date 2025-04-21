const { generateChatResponse } = require('../services/chatService');

const handleChat = async (req, res) => {
  const { message, category } = req.body;

  try {
    const response = await generateChatResponse(message, category);
    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { handleChat };
