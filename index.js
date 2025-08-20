const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const app = express();
const PORT = process.env.PORT || 22001;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for audio files
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Handle form data

// Connect to MongoDB
connectDB();

const chatRoute = require('./routes/chatRoutes');
app.use('/api/chat', chatRoute);

const writingRoute = require('./routes/writingRoutes');
app.use('/api/writing', writingRoute);

const speakingRoute = require('./routes/speakingRoute');
app.use('/api/speaking', speakingRoute);

const whisperRoute = require('./routes/whisperRoutes');
app.use('/api/whisper', whisperRoute);


const mongoRagRoute = require('./routes/mongoRagRoutes');
app.use('/api/mongo-rag', mongoRagRoute);

// Define a simple route
app.get('/', (req, res) => {
  res.send('mentors & study abroad chatbot is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
