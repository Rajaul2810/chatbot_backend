# RAG (Retrieval-Augmented Generation) Implementation

This implementation adds RAG capabilities to your chatbot, enabling more accurate and contextually relevant responses by retrieving information from your knowledge base.

## 🚀 Features

- **Vector-based Search**: Uses Pinecone vector database for semantic search
- **Automatic Document Processing**: Converts JSON data into searchable chunks
- **Easy Updates**: Simple commands to update knowledge base
- **Category-based Filtering**: Search within specific categories
- **Fallback System**: Combines RAG with existing context retrieval

## 📋 Prerequisites

1. **Pinecone Account**: Sign up at [pinecone.io](https://pinecone.io)
2. **OpenAI API Key**: For embeddings generation
3. **Environment Variables**: Configure your API keys

## 🔧 Setup

### 1. Install Dependencies
```bash
npm install
```

**Note**: This implementation uses a simplified approach without LangChain for easier setup and maintenance.

### 2. Environment Variables
Add these to your `.env` file:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=mentors-knowledge

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string_here

# Server Configuration
PORT=22001
```

### 3. Create Pinecone Index
- Go to Pinecone console
- Create a new index named `mentors-knowledge`
- Use dimension: `1536` (for OpenAI embeddings)
- Use metric: `cosine`

## 🎯 Usage

### Initial Setup
```bash
# Update entire knowledge base
npm run update-rag
```

### Update Specific Category
```bash
# Update only course fees data
npm run update-rag-category courseFees

# Update only speaking questions
npm run update-rag-category speakingQuestions
```

### API Endpoints

#### Update Knowledge Base
```bash
POST /api/rag/update-knowledge-base
```

#### Update Specific Category
```bash
POST /api/rag/update-category/:category
```

#### Get Statistics
```bash
GET /api/rag/stats
```

#### Test Search
```bash
POST /api/rag/test-search
Content-Type: application/json

{
  "query": "IELTS course fees",
  "category": "courseFees",
  "topK": 5
}
```

#### Delete Category
```bash
DELETE /api/rag/delete-category/:category
```

## 📁 File Structure

```
├── services/
│   ├── ragService.js          # LangChain-based RAG (alternative)
│   └── simpleRagService.js    # Simplified RAG functionality
├── controllers/
│   └── ragController.js       # RAG API endpoints
├── routes/
│   └── ragRoutes.js          # RAG routes
├── scripts/
│   ├── updateRAG.js          # Full knowledge base update
│   └── updateRAGCategory.js  # Category-specific update
└── data/                     # Your JSON data files
    ├── courseFees.json
    ├── speakingQuestions.json
    └── ...
```

## 🔄 How It Works

### 1. Document Processing
- Reads JSON files from `data/` directory
- Converts structured data into searchable text chunks
- Creates embeddings using OpenAI
- Stores vectors in Pinecone with metadata

### 2. Search Process
- User query is converted to embedding
- Semantic search finds most relevant chunks
- Combines RAG results with existing context
- Generates response using enhanced context

### 3. Update Process
- Deletes old vectors for updated category
- Processes new document
- Creates new embeddings
- Updates vector database

## 📊 Monitoring

### Check Vector Database Stats
```bash
curl http://localhost:22001/api/rag/stats
```

### Test Search Functionality
```bash
curl -X POST http://localhost:22001/api/rag/test-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "IELTS course price",
    "category": "courseFees"
  }'
```

## 🛠️ Maintenance

### Regular Updates
When you update your JSON data files:

1. **Full Update** (recommended for major changes):
   ```bash
   npm run update-rag
   ```

2. **Category Update** (for specific changes):
   ```bash
   npm run update-rag-category courseFees
   ```

### Performance Optimization
- Monitor vector database usage
- Clean up old vectors periodically
- Adjust chunk size based on your data structure

## 🔍 Troubleshooting

### Common Issues

1. **Pinecone API Error**
   - Verify API key and index name
   - Check index dimension matches (1536)

2. **OpenAI API Error**
   - Verify API key is valid
   - Check API quota limits

3. **Memory Issues**
   - Reduce chunk size in `ragService.js`
   - Process categories individually

### Debug Mode
Add logging to see detailed processing:
```javascript
// In ragService.js
console.log('Processing chunk:', chunk.pageContent);
```

## 📈 Benefits

- **Better Accuracy**: Semantic search finds relevant information
- **Easy Updates**: Simple commands to refresh knowledge
- **Scalable**: Handles large amounts of data efficiently
- **Flexible**: Works with your existing chatbot structure
- **Cost-Effective**: Uses existing OpenAI API for embeddings

## 🎯 Best Practices

1. **Regular Updates**: Update knowledge base when data changes
2. **Category Management**: Use specific categories for better filtering
3. **Monitoring**: Check vector database stats regularly
4. **Testing**: Test search functionality before deploying
5. **Backup**: Keep backups of your JSON data files

## 🚀 Next Steps

- Add more data sources (PDFs, web scraping)
- Implement hybrid search (keyword + semantic)
- Add caching for frequently accessed data
- Create admin dashboard for RAG management
