const Complaint = require('../models/complaintModel');

const storeComplaint = async (req, res) => {
  const { name = '', phone = '', type = '', comment = '' } = req.body;
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
