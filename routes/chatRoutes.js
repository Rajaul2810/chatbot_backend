const express = require('express');
const router = express.Router();
const { handleChat, testConversationContext, testFrontendFormat } = require('../controllers/chatController');

router.post('/', handleChat);
router.get('/test-context', testConversationContext);
router.get('/test-frontend-format', testFrontendFormat);

module.exports = router;
