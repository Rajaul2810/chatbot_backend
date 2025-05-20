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
  level: { 
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
  lastSubmissionDate: Date

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
