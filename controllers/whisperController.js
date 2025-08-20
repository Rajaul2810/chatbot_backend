const { generateWhisperResponse } = require('../services/whisperApi');
const fs = require('fs').promises;

const handleWhisper = async (req, res) => {
  let audioFilePath = null;
  
  try {
    // console.log("whisper controller - req.file:", req.file);
    // console.log("whisper controller - req.body:", req.body);
    // console.log("Content-Type:", req.headers['content-type']);
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }
    
    // Get the uploaded file path
    audioFilePath = req.file.path;
    //console.log("Audio file path:", audioFilePath);
    
    const response = await generateWhisperResponse(audioFilePath);
    
    // Clean up the temporary file
    try {
      await fs.unlink(audioFilePath);
      console.log("Temporary file cleaned up:", audioFilePath);
    } catch (cleanupError) {
      console.warn("Failed to clean up temporary file:", cleanupError);
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in handleWhisper:', error);
    
    // Clean up the temporary file in case of error
    if (audioFilePath) {
      try {
        await fs.unlink(audioFilePath);
      } catch (cleanupError) {
        console.warn("Failed to clean up temporary file after error:", cleanupError);
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { handleWhisper };