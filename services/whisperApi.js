const openai = require('../utils/openaiClient');
const fs = require('fs');

const generateWhisperResponse = async (audioFilePath) => {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioFilePath),
    model: 'whisper-1',
  });
  return response;
};

module.exports = { generateWhisperResponse };