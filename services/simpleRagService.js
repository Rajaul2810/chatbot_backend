const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');

class SimpleRAGService {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'mentors-knowledge');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Simple text chunking function
  chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      start = end - overlap;
    }
    
    return chunks;
  }

  // Create embeddings using OpenAI
  async createEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  // Process and chunk documents
  async processDocument(documentPath, category) {
    try {
      const content = await fs.readFile(documentPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert JSON to searchable text chunks
      const textChunks = this.jsonToTextChunks(data, category);
      
      // Create embeddings and store in Pinecone
      const vectors = [];
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const embedding = await this.createEmbedding(chunk);
        
        vectors.push({
          id: `${category}-${Date.now()}-${i}`,
          values: embedding,
          metadata: {
            text: chunk,
            category: category,
            source: path.basename(documentPath),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Upsert to Pinecone
      await this.index.upsert(vectors);
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

  // Search for relevant context
  async searchContext(query, category = null, topK = 5) {
    try {
      const queryEmbedding = await this.createEmbedding(query);
      
      let filter = {};
      if (category) {
        filter.category = category;
      }
      
      const searchResponse = await this.index.query({
        vector: queryEmbedding,
        topK: topK,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        includeMetadata: true
      });
      
      // Extract and format relevant context
      const context = searchResponse.matches
        .map(match => match.metadata.text)
        .join('\n\n');
      
      return {
        context,
        matches: searchResponse.matches,
        score: searchResponse.matches[0]?.score || 0
      };
    } catch (error) {
      console.error('Error searching context:', error);
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
      await this.index.deleteMany({
        filter: { category: category }
      });
      console.log(`Deleted vectors for category: ${category}`);
    } catch (error) {
      console.error('Error deleting vectors:', error);
    }
  }

  // Get vector statistics
  async getStats() {
    try {
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }
}

module.exports = new SimpleRAGService();
