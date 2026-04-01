const express = require('express');
const router = express.Router();
const { storeComplaint, getComplaints, deleteComplaint, updateComplaintStatus } = require('../controllers/complaintController');

router.post('/', storeComplaint);
router.get('/', getComplaints);
router.delete('/:id', deleteComplaint);
router.patch('/:id', updateComplaintStatus);

module.exports = router;
