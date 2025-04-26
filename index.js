const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const chatRoute = require('./routes/chatRoutes');
app.use('/api/chat', chatRoute);

// Define a simple route
app.get('/', (req, res) => {
  res.send('ai chatbot is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
