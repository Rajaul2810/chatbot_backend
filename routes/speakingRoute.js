const express = require('express');
const router = express.Router();
const { handleSpeaking, handleSpeakingQuestion, getUserProgress } = require('../controllers/speakingController');
const { ensureMongoUser } = require('../middleware/ensureUser');

router.post('/', ensureMongoUser, handleSpeaking);
router.post('/question', ensureMongoUser, handleSpeakingQuestion);
router.post('/progress', ensureMongoUser, getUserProgress);

module.exports = router;