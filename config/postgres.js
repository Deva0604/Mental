const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', // use localhost so Windows -> WSL port proxy works
  database: 'chatbot_history',
  password: 'postgres123',
  port: 5432,
});

// Test the connection and create table
const connectPostgres = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected for chat history');
    
    // Create chat_history table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Chat history table ready');
    client.release();
  } catch (error) {
    console.error('PostgreSQL connection error:', error.message);
    console.log('Continuing without PostgreSQL. Chat history will not be stored.');
  }
};

const saveChatHistory = async (userId, message, response) => {
  try {
    const client = await pool.connect();
    const query = `
      INSERT INTO chat_history (user_id, message, response) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
    const result = await client.query(query, [userId, message, response]);
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error saving chat history:', error);
    return null;
  }
};

const getChatHistory = async (userId, limit = 50) => {
  try {
    const client = await pool.connect();
    const query = `
      SELECT * FROM chat_history 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;
    const result = await client.query(query, [userId, limit]);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return [];
  }
};

module.exports = {
  connectPostgres,
  saveChatHistory,
  getChatHistory
};