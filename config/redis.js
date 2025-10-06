const Redis = require('ioredis');

const ENABLE_REDIS = (process.env.ENABLE_REDIS || 'false').toLowerCase() === 'true';

let redis = null;
let disabledReason = 'Disabled by config';

if (ENABLE_REDIS) {
  redis = new Redis(process.env.REDIS_URL || {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || '127.0.0.1',
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) {
        disabledReason = 'Too many retries – disabling Redis caching';
        return null;
      }
      return Math.min(times * 500, 3000);
    }
  });

  redis.on('error', (e) => {
    console.error('[Redis] error:', e.code || e.message);
  });

  redis.connect()
    .then(() => console.log('[Redis] connected'))
    .catch(err => {
      console.warn('[Redis] connect failed:', err.code || err.message);
      redis = null;
    });
} else {
  console.log('[Redis] disabled (ENABLE_REDIS not true)');
}

function safeParse(v) {
  try { return JSON.parse(v); } catch { return null; }
}

async function getCache(key) {
  if (!redis) return null;
  try {
    const v = await redis.get(key);
    return safeParse(v);
  } catch { return null; }
}

async function setCache(key, value, ttlSeconds = 300) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {}
}

async function delCache(key) {
  if (!redis) return;
  try { await redis.del(key); } catch {}
}

module.exports = { redis, getCache, setCache, delCache, ENABLE_REDIS, disabledReason };