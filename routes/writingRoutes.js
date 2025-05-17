const express = require('express');
const router = express.Router();
const { handleWriting, handleWritingQuestion } = require('../controllers/writingController');
const { ensureMongoUser } = require('../middleware/ensureUser');

router.post('/', ensureMongoUser, handleWriting);
router.get('/question', handleWritingQuestion);

module.exports = router;