require('dotenv').config();
const connectDB = require('../config/db');
const mongoRagService = require('../services/mongoRagService');
const path = require('path');

async function updateMongoRAGCategory() {
  try {
    // Get category from command line arguments
    const category = process.argv[2];
    
    if (!category) {
      console.error('❌ Please provide a category name as an argument');
      console.log('Usage: node scripts/updateMongoRAGCategory.js <category>');
      console.log('Example: node scripts/updateMongoRAGCategory.js branches');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    await connectDB();
    
    const dataDir = path.join(__dirname, '../data');
    const filePath = path.join(dataDir, `${category}.json`);
    
    console.log(`Starting MongoDB RAG update for category: ${category}`);
    console.log(`File path: ${filePath}`);
    
    // Delete existing vectors for this category
    console.log(`🗑️  Deleting existing vectors for category: ${category}`);
    const deletedCount = await mongoRagService.deleteCategoryVectors(category);
    console.log(`Deleted ${deletedCount} existing vectors`);
    
    // Process the document
    console.log(`📄 Processing document: ${filePath}`);
    const chunksProcessed = await mongoRagService.processDocument(filePath, category);
    
    console.log(`✅ MongoDB RAG update completed for category: ${category}`);
    console.log(`📊 Chunks processed: ${chunksProcessed}`);
    
    // Get category statistics
    const vectors = await mongoRagService.getVectorsByCategory(category);
    console.log(`📈 Total vectors in category '${category}': ${vectors.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating MongoDB RAG category:', error);
    process.exit(1);
  }
}

// Run the update
updateMongoRAGCategory();
