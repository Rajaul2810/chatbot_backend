const express = require('express');
const router = express.Router();
const {
  handleWriting,
  handleWritingQuestion,
  getUserProgress,
  getWritingHistory,
  getWritingHistoryById,
  handleWritingOcr,
} = require('../controllers/writingController');
const { ensureMongoUser } = require('../middleware/ensureUser');

router.post('/', ensureMongoUser, handleWriting);
router.post('/question', ensureMongoUser, handleWritingQuestion);
router.post('/progress', ensureMongoUser, getUserProgress);
router.post('/history', ensureMongoUser, getWritingHistory);
router.post('/history/:id', ensureMongoUser, getWritingHistoryById);
router.post('/ocr', ensureMongoUser, handleWritingOcr);

module.exports = router;
