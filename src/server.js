const crypto = require('crypto');
const express = require('express');
const { connectDb } = require('./db');
const ordersRouter = require('./routes/orders');
const { processPayment } = require('./payment');
const logger = require('./logger');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Middleware for Request ID & correlation tracing
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.log = logger.child({ reqId: req.id });

  const store = { reqId: req.id, path: req.path, method: req.method };

  logger.asyncLocalStorage.run(store, () => {
    const startTime = Date.now();
    req.log.info('Incoming request', { method: req.method, url: req.url });

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const level = res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info');
      req.log[level]('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        durationMs,
      });
    });

    next();
  });
});

logger.info('Service initialization starting');

connectDb();

app.get('/', (req, res) => {
  req.log.info('Health check endpoint called');
  res.send('Orders API is running');
});

app.use('/orders', ordersRouter);

app.post('/payments', (req, res) => {
  req.log.info('Payment endpoint triggered');
  processPayment();
  res.send('Payment processed');
});

app.get('/simulate-error', (req, res) => {
  req.log.error('Simulated failure endpoint hit', {
    error: 'Internal Server Error simulation',
    statusCode: 500,
  });
  res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
  logger.info('Server successfully listening', { port });
});
