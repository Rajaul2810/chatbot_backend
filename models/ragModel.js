const mongoose = require('mongoose');

const ragSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  embedding: {
    type: [Number],
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Create a compound index for efficient querying
ragSchema.index({ category: 1, timestamp: -1 });

// Create a text index for basic text search
ragSchema.index({ text: 'text' });

module.exports = mongoose.model('RAGEmbedding', ragSchema);
