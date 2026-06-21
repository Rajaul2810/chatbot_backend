const express = require('express');
const router = express.Router();
const { storeComplaint, getComplaints, updateComplaintStatus } = require('../controllers/complaintController');
const { requireApiKey } = require('../middleware/ensureUser');

router.post('/', storeComplaint);
router.get('/', requireApiKey, getComplaints);
router.patch('/:id', requireApiKey, updateComplaintStatus);

module.exports = router;
