function notFound(req, res, next) {
  res.status(404).json({ error: 'Route not found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error('[Error]', err.message);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
}

module.exports = { notFound, errorHandler };