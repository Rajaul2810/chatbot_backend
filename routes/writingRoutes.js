const express = require('express');
const router = express.Router();
const { handleWriting } = require('../controllers/writingController');
const { handleWritingQuestion } = require('../controllers/writingController');

router.post('/', handleWriting);
router.get('/question', handleWritingQuestion);

module.exports = router;