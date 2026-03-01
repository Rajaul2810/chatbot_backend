const express = require('express');
const router = express.Router();
const { createOrUpdateLead, getLeadsByDate } = require('../controllers/leadsController');

router.post('/', createOrUpdateLead);
router.get('/', getLeadsByDate);

module.exports = router;
