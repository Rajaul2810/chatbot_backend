const mongoRagService = require('../services/mongoRagService');

class MongoRAGController {
  // Search for relevant context
  async searchContext(req, res) {
    try {
      const { query, category, topK = 5, searchType = 'vector' } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      
      let result;
      if (searchType === 'text') {
        result = await mongoRagService.searchContextByText(query, category, topK);
      } else {
        result = await mongoRagService.searchContext(query, category, topK);
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in searchContext:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Process a single document
  async processDocument(req, res) {
    try {
      const { documentPath, category } = req.body;
      
      if (!documentPath || !category) {
        return res.status(400).json({ error: 'Document path and category are required' });
      }
      
      const chunksProcessed = await mongoRagService.processDocument(documentPath, category);
      
      res.json({
        success: true,
        message: `Processed ${chunksProcessed} chunks for category: ${category}`,
        chunksProcessed
      });
    } catch (error) {
      console.error('Error in processDocument:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update entire knowledge base
  async updateKnowledgeBase(req, res) {
    try {
      const totalChunks = await mongoRagService.updateKnowledgeBase();
      
      res.json({
        success: true,
        message: `Knowledge base updated successfully`,
        totalChunks
      });
    } catch (error) {
      console.error('Error in updateKnowledgeBase:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete vectors for a specific category
  async deleteCategoryVectors(req, res) {
    try {
      const { category } = req.params;
      
      if (!category) {
        return res.status(400).json({ error: 'Category is required' });
      }
      
      const deletedCount = await mongoRagService.deleteCategoryVectors(category);
      
      res.json({
        success: true,
        message: `Deleted ${deletedCount} vectors for category: ${category}`,
        deletedCount
      });
    } catch (error) {
      console.error('Error in deleteCategoryVectors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get RAG statistics
  async getStats(req, res) {
    try {
      const stats = await mongoRagService.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Clear all vectors
  async clearAllVectors(req, res) {
    try {
      const deletedCount = await mongoRagService.clearAllVectors();
      
      res.json({
        success: true,
        message: `Cleared all ${deletedCount} vectors`,
        deletedCount
      });
    } catch (error) {
      console.error('Error in clearAllVectors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get vectors by category
  async getVectorsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { limit = 100 } = req.query;
      
      if (!category) {
        return res.status(400).json({ error: 'Category is required' });
      }
      
      const vectors = await mongoRagService.getVectorsByCategory(category, parseInt(limit));
      
      res.json({
        success: true,
        data: vectors,
        count: vectors.length
      });
    } catch (error) {
      console.error('Error in getVectorsByCategory:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Hybrid search (combine vector and text search)
  async hybridSearch(req, res) {
    try {
      const { query, category, topK = 5 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      
      // Perform both searches
      const [vectorResult, textResult] = await Promise.all([
        mongoRagService.searchContext(query, category, topK),
        mongoRagService.searchContextByText(query, category, topK)
      ]);
      
      // Combine and deduplicate results
      const allMatches = [...vectorResult.matches, ...textResult.matches];
      const uniqueMatches = allMatches.filter((match, index, self) => 
        index === self.findIndex(m => m.id === match.id)
      );
      
      // Sort by score and take top K
      const topMatches = uniqueMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      const context = topMatches
        .map(match => match.metadata.text)
        .join('\n\n');
      
      res.json({
        success: true,
        data: {
          context,
          matches: topMatches,
          score: topMatches[0]?.score || 0,
          vectorScore: vectorResult.score,
          textScore: textResult.score
        }
      });
    } catch (error) {
      console.error('Error in hybridSearch:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new MongoRAGController();
