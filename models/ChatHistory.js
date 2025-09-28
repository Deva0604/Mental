const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/postgres');

const ChatHistory = sequelize.define('ChatHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users', // This should match your MongoDB User collection
      key: '_id'
    }
  },
  sessionId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  mood: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sentiment: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'chat_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ChatHistory;