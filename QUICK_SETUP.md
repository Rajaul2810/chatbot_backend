# 🚀 Quick RAG Setup Guide

## ✅ Installation Complete!

Your RAG implementation is now ready. Here's what you need to do next:

## 🔑 Environment Setup

1. **Add to your `.env` file:**
```env
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=mentors-knowledge
```

2. **Get Pinecone API Key:**
   - Go to [pinecone.io](https://pinecone.io)
   - Sign up for free account
   - Create API key
   - Create index named `mentors-knowledge` with dimension `1536`

## 🎯 Quick Start

### 1. Initialize Knowledge Base
```bash
npm run update-rag
```

### 2. Test the System
```bash
# Start your server
npm run dev

# Test RAG search (in another terminal)
curl -X POST http://localhost:22001/api/rag/test-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "IELTS course fees",
    "category": "courseFees"
  }'
```

## 📝 Easy Data Updates

When you update your JSON files:

```bash
# Update everything
npm run update-rag

# Update specific category
npm run update-rag-category courseFees
```

## 🔍 What's Different

- **Simplified Dependencies**: No LangChain, just Pinecone + OpenAI
- **Same Functionality**: All RAG features work the same
- **Easier Maintenance**: Fewer dependencies to manage
- **Better Performance**: Direct API calls without extra layers

## 🎉 You're Ready!

Your chatbot now has RAG capabilities:
- ✅ Vector-based semantic search
- ✅ Easy data updates
- ✅ Category filtering
- ✅ Fallback to existing context
- ✅ Simple maintenance

The system will automatically enhance your chatbot responses with relevant information from your knowledge base!
