const Complaint = require('../models/complaintModel');

const HTML_TAG_REGEX = /<\s*\/?\s*[a-zA-Z][^>]*>/;
const SCRIPT_PATTERN_REGEX = /<\s*script\b|javascript:|on\w+\s*=/i;

function containsHtmlOrScript(value) {
  if (value == null || value === '') return false;
  const text = String(value);
  return HTML_TAG_REGEX.test(text) || SCRIPT_PATTERN_REGEX.test(text);
}

const storeComplaint = async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();
  const type = String(req.body.type ?? '').trim();
  const comment = String(req.body.comment ?? '').trim();

  const fields = { name, phone, type, comment };
  const unsafeField = Object.entries(fields).find(([, value]) => containsHtmlOrScript(value));
  if (unsafeField) {
    return res.status(400).json({ error: `Invalid ${unsafeField[0]}: HTML tags or scripts are not allowed` });
  }

  try {
    const complaint = await Complaint.create({ name, phone, type, comment });
    res.status(201).json(complaint);
  } catch (error) {
    console.error('Complaint store error:', error);
    res.status(500).json({ error: 'Failed to save complaint' });
  }
};

const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 }).lean();
    res.json({ count: complaints.length, complaints });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};



const updateComplaintStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await Complaint.findByIdAndUpdate(id, { status });
    res.json({ message: 'Complaint status updated successfully' });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
};

module.exports = { storeComplaint, getComplaints, updateComplaintStatus };
