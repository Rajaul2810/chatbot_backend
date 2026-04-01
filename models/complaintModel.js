const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  type: { type: String, default: '' },
  comment: { type: String, default: '' },
  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
