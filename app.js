// app.js
const express = require('express');
const loginRouter = require('./routes/login');
const registerRouter = require('./routes/register');
const mentalHealthRouter = require('./routes/mentalhealth'); // Add this

const app = express();

app.use('/api/login', loginRouter);
app.use('/api/register', registerRouter);
app.use('/api/mentalhealth', mentalHealthRouter); // Add this

app.listen(3000, () => {
  console.log('Server running on port 3000');
});