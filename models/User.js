const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  mysqlUserId: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  name: String,
  email: String,
  phone: String,
  //writing
  writingLevel: { 
    type: String, 
    default: 'Beginner' 
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  completedQuestions: [{
    questionId: String,
    score: Number,
    completedAt: Date
  }],
  averageScore: { 
    type: Number, 
    default: 0 
  },
  totalSubmissions: { 
    type: Number, 
    default: 0 
  },
  lastSubmissionDate: Date,
  //speaking
  speakingLevel: { 
    type: String, 
    default: 'Beginner' 
  },
  speakingCurrentQuestionIndex: {
    type: Number, 
    default: 0
  },
  speakingCompletedQuestions: [{
    questionId: String,
    score: Number,
    completedAt: Date
  }],
  speakingAverageScore: { 
    type: Number, 
    default: 0 
  },
  speakingTotalSubmissions: { 
    type: Number, 
    default: 0 
  },
  speakingLastSubmissionDate: Date,
  //listening
  listeningLevel: { 
    type: String, 
    default: 'Beginner' 
  },
  listeningCurrentQuestionIndex: {
    type: Number, 
    default: 0
  },  
  listeningCompletedQuestions: [{
    questionId: String,
    score: Number,
    completedAt: Date
  }],
  listeningAverageScore: { 
    type: Number, 
    default: 0 
  },
  listeningTotalSubmissions: { 
    type: Number, 
    default: 0 
  },
  listeningLastSubmissionDate: Date,
  //reading
  readingLevel: { 
    type: String, 
    default: 'Beginner' 
  },
  readingCurrentQuestionIndex: {
    type: Number, 
    default: 0
  },
  readingCompletedQuestions: [{
    questionId: String,
    score: Number,
    completedAt: Date
  }],
  readingAverageScore: { 
    type: Number, 
    default: 0 
  },
  readingTotalSubmissions: { 
    type: Number, 
    default: 0 
  },
  readingLastSubmissionDate: Date

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
