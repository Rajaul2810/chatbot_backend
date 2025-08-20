require('dotenv').config();
const ragService = require('../services/simpleRagService');

async function updateRAG() {
  try {
    console.log('🔄 Starting RAG knowledge base update...');
    
    // Update entire knowledge base
    const totalChunks = await ragService.updateKnowledgeBase();
    
    console.log(`✅ Successfully processed ${totalChunks} chunks`);
    
    // Get statistics
    const stats = await ragService.getStats();
    console.log('📊 Vector Database Stats:', stats);
    
    console.log('🎉 RAG update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating RAG:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateRAG();
}

module.exports = updateRAG;
