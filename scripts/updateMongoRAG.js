require('dotenv').config();
const connectDB = require('../config/db');
const mongoRagService = require('../services/mongoRagService');

async function updateMongoRAG() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    console.log('Starting MongoDB RAG knowledge base update...');
    const totalChunks = await mongoRagService.updateKnowledgeBase();
    
    console.log(`✅ MongoDB RAG knowledge base updated successfully!`);
    console.log(`📊 Total chunks processed: ${totalChunks}`);
    
    // Get and display statistics
    const stats = await mongoRagService.getStats();
    if (stats) {
      console.log('\n📈 Knowledge Base Statistics:');
      console.log(`Total vectors: ${stats.totalVectors}`);
      console.log('\nCategory breakdown:');
      stats.categoryStats.forEach(cat => {
        console.log(`  ${cat._id}: ${cat.count} vectors`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating MongoDB RAG knowledge base:', error);
    process.exit(1);
  }
}

// Run the update
updateMongoRAG();
