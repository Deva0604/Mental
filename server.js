const express = require('express');
const connectDB = require('./config/db');
const { connectPostgres } = require('./config/postgres');
const dotenv = require('dotenv');
const mentalHealthRouter = require('./routes/mentalhealth');

dotenv.config();
const app = express();

// Connect to MongoDB (for user auth, profiles, etc.)
connectDB();

// Connect to PostgreSQL (for chat history only)
connectPostgres();

// Middleware
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/mood', require('./routes/mood'));
app.use('/appointment', require('./routes/appointment'));
app.use('/api/mentalhealth', mentalHealthRouter);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));