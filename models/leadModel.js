const mongoose = require('mongoose');
const crypto = require('crypto');

const leadSchema = new mongoose.Schema({
  id: { type: String, default: () => crypto.randomUUID(), unique: true },
  phone: { type: String, required: true, index: true },
  course: { type: String, default: null },
  source: { type: String, default: 'chatbot_learning', enum: ['chatbot_learning', 'chatbot_info'] },
  intent_score: { type: Number, default: 1 },
  status: { type: String, default: 'new', enum: ['new', 'contacted', 'converted'] },
  conversation_id: { type: String, default: null },
}, { timestamps: true });

leadSchema.index({ phone: 1, course: 1 });

module.exports = mongoose.model('Lead', leadSchema);
