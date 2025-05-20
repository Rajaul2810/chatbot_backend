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
  ReWriteCorrectVersion: {
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
  }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
