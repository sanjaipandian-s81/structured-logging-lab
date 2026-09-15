const { Pool } = require('pg');
const logger = require('./logger');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  database: process.env.DB_NAME || 'ordersdb',
  port: process.env.DB_PORT || 5432,
};

const pool = new Pool(dbConfig);

const connectDb = async () => {
  logger.info('Connecting to PostgreSQL database', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
  });

  try {
    await pool.query('SELECT NOW()');
    logger.info('Successfully connected to PostgreSQL database');
  } catch (err) {
    logger.error('Database connection attempt failed', { err });
  }
};

const queryDb = async (text, params) => {
  const startTime = Date.now();
  logger.info('Executing database query', { query: text });

  try {
    const res = await pool.query(text, params);
    const durationMs = Date.now() - startTime;
    logger.info('Database query finished', { query: text, rowCount: res.rowCount, durationMs });
    return res;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error('Database query failed', { query: text, err, durationMs });
    throw err;
  }
};

module.exports = { connectDb, queryDb, pool };
