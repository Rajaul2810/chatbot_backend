# MongoDB RAG Implementation

This implementation provides a Retrieval-Augmented Generation (RAG) system using MongoDB instead of Pinecone for vector storage and similarity search.

## Features

- **Vector Storage**: Store embeddings directly in MongoDB
- **Similarity Search**: Cosine similarity-based search for relevant context
- **Text Search**: Alternative text-based search using MongoDB's text indexes
- **Hybrid Search**: Combine vector and text search for better results
- **Category Management**: Organize vectors by categories
- **Statistics**: Get detailed statistics about your knowledge base
- **Batch Processing**: Process multiple documents efficiently

## Architecture

### Components

1. **RAG Model** (`models/ragModel.js`): MongoDB schema for storing embeddings
2. **MongoDB RAG Service** (`services/mongoRagService.js`): Core RAG functionality
3. **MongoDB RAG Controller** (`controllers/mongoRagController.js`): API endpoints
4. **MongoDB RAG Routes** (`routes/mongoRagRoutes.js`): Route definitions

### Database Schema

```javascript
{
  id: String,           // Unique identifier
  embedding: [Number],  // Vector embedding
  text: String,         // Original text chunk
  category: String,     // Category classification
  source: String,       // Source document
  metadata: Object,     // Additional metadata
  timestamp: Date       // Creation timestamp
}
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Add these to your `.env` file:

```env
MONGODB_URL=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
```

### 3. Initialize Knowledge Base

```bash
# Update entire knowledge base
npm run update-mongo-rag

# Update specific category
npm run update-mongo-rag-category <category_name>
```

## API Endpoints

### Search Endpoints

#### Vector Search
```http
POST /api/mongo-rag/search
Content-Type: application/json

{
  "query": "your search query",
  "category": "optional_category_filter",
  "topK": 5,
  "searchType": "vector"
}
```

#### Text Search
```http
POST /api/mongo-rag/search
Content-Type: application/json

{
  "query": "your search query",
  "category": "optional_category_filter",
  "topK": 5,
  "searchType": "text"
}
```

#### Hybrid Search
```http
POST /api/mongo-rag/hybrid-search
Content-Type: application/json

{
  "query": "your search query",
  "category": "optional_category_filter",
  "topK": 5
}
```

### Management Endpoints

#### Process Document
```http
POST /api/mongo-rag/process-document
Content-Type: application/json

{
  "documentPath": "path/to/document.json",
  "category": "category_name"
}
```

#### Update Knowledge Base
```http
POST /api/mongo-rag/update-knowledge-base
```

#### Get Statistics
```http
GET /api/mongo-rag/stats
```

#### Get Vectors by Category
```http
GET /api/mongo-rag/vectors/:category?limit=100
```

#### Delete Category Vectors
```http
DELETE /api/mongo-rag/vectors/:category
```

#### Clear All Vectors
```http
DELETE /api/mongo-rag/vectors
```

## Usage Examples

### 1. Basic Search

```javascript
const response = await fetch('/api/mongo-rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "What are the study abroad requirements?",
    topK: 5
  })
});

const result = await response.json();
console.log(result.data.context);
```

### 2. Category-Specific Search

```javascript
const response = await fetch('/api/mongo-rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "IELTS requirements",
    category: "studyAbroad",
    topK: 3
  })
});
```

### 3. Hybrid Search

```javascript
const response = await fetch('/api/mongo-rag/hybrid-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "course fees and duration",
    category: "courseFees"
  })
});
```

## Performance Considerations

### Vector Search Performance

- **Small Datasets**: MongoDB vector search works well for datasets with < 10,000 vectors
- **Large Datasets**: Consider using specialized vector databases like Pinecone or Weaviate
- **Indexing**: Ensure proper indexes are created on `category` and `timestamp` fields

### Optimization Tips

1. **Batch Processing**: Use `insertMany()` for bulk operations
2. **Indexing**: Create compound indexes for frequently queried fields
3. **Caching**: Implement Redis caching for frequently accessed results
4. **Pagination**: Use limit/offset for large result sets

## Comparison with Pinecone

| Feature | MongoDB RAG | Pinecone RAG |
|---------|-------------|--------------|
| Setup Complexity | Simple | Moderate |
| Cost | Low (MongoDB hosting) | Higher (Pinecone pricing) |
| Performance | Good for small-medium datasets | Excellent for all sizes |
| Scalability | Limited by MongoDB | Highly scalable |
| Customization | Full control | Limited |
| Maintenance | Self-hosted | Managed service |

## Troubleshooting

### Common Issues

1. **Memory Issues**: Large embeddings can cause memory problems
   - Solution: Process documents in smaller batches

2. **Slow Queries**: Vector similarity calculations can be slow
   - Solution: Implement caching or use text search for simple queries

3. **Index Issues**: Missing indexes can cause slow queries
   - Solution: Ensure all required indexes are created

### Debug Commands

```bash
# Check MongoDB connection
node -e "require('./config/db')().then(() => console.log('Connected')).catch(console.error)"

# Test RAG service
node -e "require('./services/mongoRagService').getStats().then(console.log).catch(console.error)"
```

## Migration from Pinecone

If you're migrating from the existing Pinecone implementation:

1. **Export Data**: Export vectors from Pinecone
2. **Transform Data**: Convert to MongoDB format
3. **Import Data**: Use the MongoDB RAG service to import
4. **Update Code**: Replace Pinecone service calls with MongoDB service calls

## Future Enhancements

- [ ] Implement vector quantization for reduced storage
- [ ] Add support for multiple embedding models
- [ ] Implement semantic caching
- [ ] Add real-time vector updates
- [ ] Support for document versioning
- [ ] Implement vector clustering for better organization
