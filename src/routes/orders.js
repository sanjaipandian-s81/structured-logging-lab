const express = require('express');
const router = express.Router();
const { queryDb } = require('../db');
const logger = require('../logger');

router.get('/', async (req, res) => {
  const log = req.log || logger;
  log.info('Fetching orders list');
  try {
    const result = await queryDb('SELECT * FROM orders', []);
    log.info('Orders retrieved successfully', { count: result.rows.length });
    res.json(result.rows);
  } catch (err) {
    log.error('Failed to fetch orders from database', { err });
    res.status(500).send('Error fetching orders');
  }
});

router.post('/', async (req, res) => {
  const log = req.log || logger;
  log.info('Received request to create order');
  const { product_id, quantity, customer_id } = req.body;

  if (!product_id || !quantity || !customer_id) {
    log.warn('Order creation rejected: missing required fields', {
      providedFields: Object.keys(req.body || {}),
    });
    return res.status(400).send('Missing fields');
  }

  try {
    const result = await queryDb(
      'INSERT INTO orders (product_id, quantity, customer_id) VALUES ($1, $2, $3) RETURNING *',
      [product_id, quantity, customer_id]
    );
    const createdOrder = result.rows[0];
    log.info('Order created successfully', {
      orderId: createdOrder.id,
      productId: product_id,
      quantity,
      customerId: customer_id,
    });
    res.status(201).json(createdOrder);
  } catch (err) {
    log.error('Failed to insert order into database', {
      err,
      productId: product_id,
      customerId: customer_id,
    });
    res.status(500).send('Error creating order');
  }
});

module.exports = router;
