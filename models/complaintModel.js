const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  type: { type: String, default: '' },
  comment: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
