const mongoose = require('mongoose');

const mistakePairSchema = new mongoose.Schema(
  {
    wrong: { type: String, default: '' },
    correct: { type: String, default: '' },
  },
  { _id: false }
);

const nextFocusSchema = new mongoose.Schema(
  {
    criterion: { type: String, default: '' },
    action: { type: String, default: '' },
    practiceTip: { type: String, default: '' },
  },
  { _id: false }
);

const bandSampleSchema = new mongoose.Schema(
  {
    targetBand: { type: Number, min: 1, max: 9 },
    writing: { type: String, default: '' },
    whyHigher: { type: [String], default: [] },
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    taskType: {
      type: String,
      enum: ['Task 1', 'Task 2'],
      required: true,
    },
    isAIWriting: {
      type: Boolean,
      default: false,
    },
    topic: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    topicRelevance: {
      type: String,
      enum: ['on-topic', 'partially-related', 'off-topic'],
      default: 'on-topic',
    },
    topicMismatchReason: {
      type: String,
      default: '',
    },
    AiMotivation: {
      type: String,
      default: '',
    },
    AiSuggestions: {
      type: String,
      default: '',
    },
    AiGenerateWriting: {
      type: String,
      default: '',
    },
    ReWriteImprovementVersion: {
      type: String,
      default: '',
    },
    TotalGrammerError: {
      type: String,
      default: '',
    },
    TotalVocabularyError: {
      type: String,
      default: '',
    },
    TotalSentenceError: {
      type: String,
      default: '',
    },
    ReWriteCorrectWords: {
      type: String,
      default: '',
    },
    ReWriteCorrectSentences: {
      type: String,
      default: '',
    },
    wordMistakes: {
      type: [mistakePairSchema],
      default: [],
    },
    sentenceMistakes: {
      type: [mistakePairSchema],
      default: [],
    },
    topPriorities: {
      type: [String],
      default: [],
    },
    nextFocus: {
      type: nextFocusSchema,
      default: () => ({}),
    },
    bandSamples: {
      type: [bandSampleSchema],
      default: [],
    },
    score: {
      taskAchievement: { type: Number, min: 0, max: 9 },
      coherenceAndCohesion: { type: Number, min: 0, max: 9 },
      lexicalResource: { type: Number, min: 0, max: 9 },
      grammaticalRangeAndAccuracy: { type: Number, min: 0, max: 9 },
      overallBandScore: { type: Number, min: 0, max: 9 },
    },
    feedback: {
      type: String,
      default: '',
    },
    detailedFeedback: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    evaluator: {
      type: String,
      default: 'AI',
    },
    status: {
      type: String,
      enum: ['pending', 'evaluated', 'rejected'],
      default: 'pending',
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

SubmissionSchema.index({ userId: 1, submissionDate: -1 });

SubmissionSchema.statics.checkDailyLimit = async function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dailySubmissions = await this.countDocuments({
    userId: userId,
    submissionDate: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  return dailySubmissions < 2;
};

module.exports = mongoose.model('Submission', SubmissionSchema);
