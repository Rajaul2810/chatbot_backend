const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  questionId: {
    type: String,
    required: true
  },
  taskType: { 
    type: String, 
    enum: ['Task 1', 'Task 2'], 
    required: true 
  },
  isAIWriting: {
    type: Boolean,
    default: false
  },
  topic: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  AiMotivation: {
    type: String,
  },
  AiSuggestions: {
    type: String,
  },
  AiGenerateWriting: {
    type: String,
  },
  ReWriteImprovementVersion: {
    type: String,
  },
  TotalGrammerError: {
    type: String,
  },
  TotalVocabularyError: {
    type: String,
  },
  TotalSentenceError: {
    type: String,
  },
  ReWriteCorrectWords: {
    type: String,
  },
  ReWriteCorrectSentences: {
    type: String,
  },
  score: {
    taskAchievement: { type: Number, min: 0, max: 9 },
    coherenceAndCohesion: { type: Number, min: 0, max: 9 },
    lexicalResource: { type: Number, min: 0, max: 9 },
    grammaticalRangeAndAccuracy: { type: Number, min: 0, max: 9 },
    overallBandScore: { type: Number, min: 0, max: 9 }
  },
  feedback: { 
    type: String 
  },
  detailedFeedback: {
    type: mongoose.Schema.Types.Mixed
  },
  evaluator: { 
    type: String, 
    default: 'AI' 
  },
  status: {
    type: String,
    enum: ['pending', 'evaluated', 'rejected'],
    default: 'pending'
  },
  submissionDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Static method to check daily submission limit
SubmissionSchema.statics.checkDailyLimit = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dailySubmissions = await this.countDocuments({
    userId: userId,
    submissionDate: {
      $gte: today,
      $lt: tomorrow
    }
  });

  return dailySubmissions < 2; // Returns true if user can submit more, false if limit reached
};

module.exports = mongoose.model('Submission', SubmissionSchema);
