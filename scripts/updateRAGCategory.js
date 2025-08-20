require('dotenv').config();
const ragService = require('../services/simpleRagService');

async function updateCategory(categoryName) {
  try {
    if (!categoryName) {
      console.error('❌ Please provide a category name');
      console.log('Usage: node scripts/updateRAGCategory.js <category-name>');
      console.log('Example: node scripts/updateRAGCategory.js courseFees');
      process.exit(1);
    }

    console.log(`🔄 Updating RAG for category: ${categoryName}`);
    
    // Delete old vectors for this category
    await ragService.deleteCategoryVectors(categoryName);
    
    // Process new document
    const filePath = `./data/${categoryName}.json`;
    const chunks = await ragService.processDocument(filePath, categoryName);
    
    console.log(`✅ Successfully processed ${chunks} chunks for ${categoryName}`);
    
    // Get statistics
    const stats = await ragService.getStats();
    console.log('📊 Vector Database Stats:', stats);
    
    console.log('🎉 Category update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating category:', error);
    process.exit(1);
  }
}

// Get category name from command line arguments
const categoryName = process.argv[2];

// Run if called directly
if (require.main === module) {
  updateCategory(categoryName);
}

module.exports = updateCategory;
