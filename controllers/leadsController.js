const Lead = require('../models/leadModel');

function notifyAdmin(lead, updated) {
  //console.log(`[Lead] ${updated ? 'Updated' : 'New'}: ${lead.phone} | course: ${lead.course || '-'} | source: ${lead.source}`);
}

const createOrUpdateLead = async (req, res) => {
  const { phone, course, source = 'chatbot', conversation_id } = req.body;
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'phone is required' });
  }
  const normalizedPhone = phone.trim();
  try {
    const existing = await Lead.findOne({ phone: normalizedPhone });
    if (existing) {
      existing.intent_score = (existing.intent_score || 1) + 1;
      if (course != null) existing.course = course;
      if (conversation_id != null) existing.conversation_id = conversation_id;
      await existing.save();
      notifyAdmin(existing, true);
      res.status(200).json({ lead: existing, updated: true });
    } else {
      const lead = await Lead.create({
        phone: normalizedPhone,
        course: course || null,
        source: source === 'web' ? 'web' : 'chatbot',
        intent_score: 1,
        status: 'new',
        conversation_id: conversation_id || null
      });
      notifyAdmin(lead, false);
      res.status(201).json({ lead, updated: false });
    }
  } catch (error) {
    console.error('Leads error:', error);
    res.status(500).json({ error: 'Failed to save lead' });
  }
};

const getLeadsByDate = async (req, res) => {
  const { from, to, date } = req.query;
  try {
    let start, end;
    if (date) {
      start = new Date(date);
      if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid date' });
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else if (from && to) {
      start = new Date(from);
      end = new Date(to);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid from or to date' });
      end.setDate(end.getDate() + 1);
    } else {
      return res.status(400).json({ error: 'Provide date (YYYY-MM-DD) or from & to' });
    }
    const leads = await Lead.find({
      createdAt: { $gte: start, $lt: end }
    }).sort({ createdAt: -1 }).lean();
    res.json({ count: leads.length, leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

module.exports = { createOrUpdateLead, getLeadsByDate };
