const express = require('express');
const router = express.Router();
const mongoRagController = require('../controllers/mongoRagController');

// Search for relevant context
router.post('/search', mongoRagController.searchContext);

// Hybrid search (combine vector and text search)
router.post('/hybrid-search', mongoRagController.hybridSearch);

// Process a single document
router.post('/process-document', mongoRagController.processDocument);

// Update entire knowledge base
router.post('/update-knowledge-base', mongoRagController.updateKnowledgeBase);

// Get RAG statistics
router.get('/stats', mongoRagController.getStats);

// Get vectors by category
router.get('/vectors/:category', mongoRagController.getVectorsByCategory);

// Delete vectors for a specific category
router.delete('/vectors/:category', mongoRagController.deleteCategoryVectors);

// Clear all vectors
router.delete('/vectors', mongoRagController.clearAllVectors);

module.exports = router;
