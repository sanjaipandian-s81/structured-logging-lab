const logger = require('./logger');

const processPayment = () => {
  logger.info('Payment processing pipeline started');
  // Simulate payment processing
  setTimeout(() => {
    logger.info('Payment processing completed successfully', { status: 'success' });
  }, 500);
};

module.exports = { processPayment };
