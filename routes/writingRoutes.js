const express = require('express');
const router = express.Router();
const { handleWriting, handleWritingQuestion, getUserProgress } = require('../controllers/writingController');
const { ensureMongoUser } = require('../middleware/ensureUser');

router.post('/', ensureMongoUser, handleWriting);
router.post('/question', ensureMongoUser, handleWritingQuestion);
router.post('/progress', ensureMongoUser, getUserProgress);

module.exports = router;