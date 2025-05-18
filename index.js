const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const app = express();
const PORT = process.env.PORT || 22001;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

const chatRoute = require('./routes/chatRoutes');
app.use('/api/chat', chatRoute);

const writingRoute = require('./routes/writingRoutes');
app.use('/api/writing', writingRoute);

// Define a simple route
app.get('/', (req, res) => {
  res.send('mentors & study abroad chatbot is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
