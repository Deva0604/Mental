const express = require('express');
const Journal = require('../models/Journal.js');
const Chat = require('../models/Chat.js');

const router = express.Router();

router.post("/journal", async (req, res) => {
  try {
    const { userId, entry } = req.body;
    const journal = new Journal({ userId, entry });
    await journal.save();
    res.json({ message: "Journal saved", journal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/weekly-summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const chats = await Chat.find({ userId }).limit(20).sort({ createdAt: -1 });
    const journals = await Journal.find({ userId }).limit(7).sort({ createdAt: -1 });

    res.json({ message: "Weekly summary", chats, journals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;