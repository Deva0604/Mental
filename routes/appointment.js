const express = require('express');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');
const router = express.Router();

// Schedule appointment
router.post('/', auth, async (req, res) => {
  try {
    const { date, time, purpose } = req.body;
    const appointment = new Appointment({ userId: req.user.id, date, time, purpose });
    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get appointments
router.get('/', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user.id }).sort({ date: 1 });
    res.json(appointments);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;