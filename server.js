const express = require('express');
const connectDB = require('./config/db');
const { connectPostgres } = require('./config/postgres');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
require('dotenv').config();
require('./config/redis'); // safe even if disabled

const mentalHealthRouter = require('./routes/mentalhealth');

const app = express();

// Connect to MongoDB (for user auth, profiles, etc.)
connectDB();

// Connect to PostgreSQL (for chat history only)
connectPostgres();

// Middleware
app.use(express.json());

// Apply rate limiting
app.use('/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/mood', require('./routes/mood'));
app.use('/appointment', require('./routes/appointment'));
app.use('/api/mentalhealth', mentalHealthRouter);

// New Mental Health API Routes
console.log('Loading chat route...');
app.use('/api/chat', require('./routes/chat'));
console.log('Loading onboarding route...');
app.use('/api', require('./routes/onboarding'));
console.log('Loading checkin route...');
app.use('/api', require('./routes/checkin'));
console.log('Loading journal route...');
app.use('/api', require('./routes/journal'));
console.log('Loading goals route...');
app.use('/api', require('./routes/goals'));
console.log('Loading knowledge route...');
app.use('/api', require('./routes/knowledge'));
console.log('Loading insights route...');
app.use('/api', require('./routes/insights'));

// 404 + error handling
app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT,10) || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));