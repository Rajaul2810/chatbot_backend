const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const fs = require('fs-extra');
const path = require('path');
const RAGEmbedding = require('../models/ragModel');

class MongoRAGService {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
  }

  // Process and chunk documents
  async processDocument(documentPath, category) {
    try {
      const content = await fs.readFile(documentPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert JSON to searchable text chunks
      const textChunks = this.jsonToTextChunks(data, category);
      
      // Split into smaller chunks
      const chunks = await this.textSplitter.createDocuments(textChunks);
      
      // Create embeddings and store in MongoDB
      const vectors = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.embeddings.embedQuery(chunk.pageContent);
        
        const vectorDoc = new RAGEmbedding({
          id: `${category}-${Date.now()}-${i}`,
          embedding: embedding,
          text: chunk.pageContent,
          category: category,
          source: path.basename(documentPath),
          metadata: {
            chunkIndex: i,
            totalChunks: chunks.length,
            documentPath: documentPath
          }
        });
        
        vectors.push(vectorDoc);
      }
      
      // Save to MongoDB
      await RAGEmbedding.insertMany(vectors);
      console.log(`Processed ${vectors.length} chunks for ${category}`);
      
      return vectors.length;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  // Convert JSON data to searchable text chunks
  jsonToTextChunks(data, category) {
    const chunks = [];
    
    const processObject = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          processObject(value, `${prefix}${key} `);
        } else if (Array.isArray(value)) {
          const arrayText = `${prefix}${key}: ${value.join(', ')}`;
          chunks.push(arrayText);
        } else {
          const text = `${prefix}${key}: ${value}`;
          chunks.push(text);
        }
      }
    };
    
    processObject(data);
    return chunks;
  }

  // Search for relevant context using vector similarity
  async searchContext(query, category = null, topK = 5) {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Build filter for MongoDB query
      let filter = {};
      if (category) {
        filter.category = category;
      }
      
      // Get all embeddings that match the filter
      const embeddings = await RAGEmbedding.find(filter).lean();
      
      // Calculate similarities and sort
      const similarities = embeddings.map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }));
      
      // Sort by similarity and take top K
      const topMatches = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
      
      // Extract and format relevant context
      const context = topMatches
        .map(match => match.text)
        .join('\n\n');
      
      return {
        context,
        matches: topMatches.map(match => ({
          id: match.id,
          score: match.similarity,
          metadata: {
            text: match.text,
            category: match.category,
            source: match.source,
            timestamp: match.timestamp
          }
        })),
        score: topMatches[0]?.similarity || 0
      };
    } catch (error) {
      console.error('Error searching context:', error);
      return { context: '', matches: [], score: 0 };
    }
  }

  // Search using text-based search (alternative to vector search)
  async searchContextByText(query, category = null, topK = 5) {
    try {
      let filter = {};
      if (category) {
        filter.category = category;
      }
      
      // Use MongoDB text search
      const results = await RAGEmbedding.find(
        { ...filter, $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(topK)
      .lean();
      
      const context = results
        .map(doc => doc.text)
        .join('\n\n');
      
      return {
        context,
        matches: results.map(doc => ({
          id: doc.id,
          score: doc.score,
          metadata: {
            text: doc.text,
            category: doc.category,
            source: doc.source,
            timestamp: doc.timestamp
          }
        })),
        score: results[0]?.score || 0
      };
    } catch (error) {
      console.error('Error searching context by text:', error);
      return { context: '', matches: [], score: 0 };
    }
  }

  // Update knowledge base
  async updateKnowledgeBase() {
    const dataDir = path.join(__dirname, '../data');
    const files = await fs.readdir(dataDir);
    
    let totalChunks = 0;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dataDir, file);
        const category = path.basename(file, '.json');
        
        console.log(`Processing ${file}...`);
        const chunks = await this.processDocument(filePath, category);
        totalChunks += chunks;
      }
    }
    
    console.log(`Total chunks processed: ${totalChunks}`);
    return totalChunks;
  }

  // Delete old vectors for a category
  async deleteCategoryVectors(category) {
    try {
      const result = await RAGEmbedding.deleteMany({ category: category });
      console.log(`Deleted ${result.deletedCount} vectors for category: ${category}`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error deleting vectors:', error);
      throw error;
    }
  }

  // Get vector statistics
  async getStats() {
    try {
      const totalCount = await RAGEmbedding.countDocuments();
      const categoryStats = await RAGEmbedding.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const recentActivity = await RAGEmbedding.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .select('category timestamp')
        .lean();
      
      return {
        totalVectors: totalCount,
        categoryStats,
        recentActivity
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  // Clear all vectors
  async clearAllVectors() {
    try {
      const result = await RAGEmbedding.deleteMany({});
      console.log(`Deleted all ${result.deletedCount} vectors`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error clearing vectors:', error);
      throw error;
    }
  }

  // Get vectors by category
  async getVectorsByCategory(category, limit = 100) {
    try {
      const vectors = await RAGEmbedding.find({ category })
        .limit(limit)
        .select('id text timestamp')
        .lean();
      
      return vectors;
    } catch (error) {
      console.error('Error getting vectors by category:', error);
      throw error;
    }
  }
}

module.exports = new MongoRAGService();
