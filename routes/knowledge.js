const express = require('express');
const Resource = require('../models/Resource.js');
const { getCache, setCache } = require('../config/redis');

const router = express.Router();

router.get("/resources/:tag", async (req, res, next) => {
  try {
    const { tag } = req.params;
    const cacheKey = `resources:${tag.toLowerCase()}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);
    const resources = await Resource.find({ tag });
    await setCache(cacheKey, resources, 600);
    res.json(resources);
  } catch (e) { next(e); }
});

module.exports = router;