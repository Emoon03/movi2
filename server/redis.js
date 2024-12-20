const redis = require('redis');
require('dotenv').config({ path: '../.env'});

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Connect to Redis when the module is imported
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis connection error:', err);
  }
})();

module.exports = redisClient; 