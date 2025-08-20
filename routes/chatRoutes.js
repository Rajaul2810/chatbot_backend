const express = require('express');
const router = express.Router();
const { handleChat, testConversationContext, testFrontendFormat, testMultipleCourseContext } = require('../controllers/chatController');

router.post('/', handleChat);
router.get('/test-context', testConversationContext);
router.get('/test-frontend-format', testFrontendFormat);
router.get('/test-multiple-course', testMultipleCourseContext);

module.exports = router;
