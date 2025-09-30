import { createClient } from 'redis';
import { logger } from '../utils/logger';

let redisClient: ReturnType<typeof createClient>;

export async function initializeRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_delay_on_failure: 1000,
      max_retry_delay: 5000
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    await redisClient.connect();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.error('Error initializing Redis:', error);
    throw error;
  }
}

export { redisClient };

// Cache helpers
export async function setCache(key: string, value: any, ttl: number = 3600) {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error('Error setting cache:', error);
  }
}

export async function getCache(key: string) {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Error getting cache:', error);
    return null;
  }
}

export async function deleteCache(key: string) {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Error deleting cache:', error);
  }
}

// Queue management
export async function addToQueue(queueName: string, data: any, priority: number = 0) {
  try {
    const timestamp = Date.now();
    const score = priority * 1000000 + timestamp; // Higher priority first, then FIFO
    await redisClient.zAdd(`queue:${queueName}`, {
      score,
      value: JSON.stringify({ data, timestamp, priority })
    });
  } catch (error) {
    logger.error('Error adding to queue:', error);
  }
}

export async function getFromQueue(queueName: string, count: number = 1) {
  try {
    const items = await redisClient.zPopMax(`queue:${queueName}`, count);
    return items.map(item => JSON.parse(item.value));
  } catch (error) {
    logger.error('Error getting from queue:', error);
    return [];
  }
}

export async function getQueueLength(queueName: string): Promise<number> {
  try {
    return await redisClient.zCard(`queue:${queueName}`);
  } catch (error) {
    logger.error('Error getting queue length:', error);
    return 0;
  }
}