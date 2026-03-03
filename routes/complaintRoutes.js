const express = require('express');
const router = express.Router();
const { storeComplaint, getComplaints } = require('../controllers/complaintController');

router.post('/', storeComplaint);
router.get('/', getComplaints);

module.exports = router;
