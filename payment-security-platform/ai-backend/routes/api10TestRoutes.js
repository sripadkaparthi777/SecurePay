import express from 'express';

const router = express.Router();

router.post('/external-data-test', async (req, res) => {
  const { data } = req.body || {};

  if (!data || typeof data !== 'object') {
    return res.status(400).json({
      success: false,
      securityCategory: 'API10',
      error: 'External data object is required.'
    });
  }

  const allowedFields = [
    'transactionId',
    'status',
    'amount',
    'currency'
  ];

  const unexpectedFields = Object.keys(data).filter(
    key => !allowedFields.includes(key)
  );

  if (unexpectedFields.length > 0) {
    return res.status(400).json({
      success: false,
      securityCategory: 'API10',
      error: 'Unexpected fields rejected.',
      rejectedFields: unexpectedFields
    });
  }

  if (
    typeof data.amount !== 'undefined' &&
    (
      typeof data.amount !== 'number' ||
      !Number.isFinite(data.amount) ||
      data.amount < 0
    )
  ) {
    return res.status(400).json({
      success: false,
      securityCategory: 'API10',
      error: 'Invalid amount received from external source.'
    });
  }

  res.json({
    success: true,
    securityCategory: 'API10',
    message: 'External data validated successfully.'
  });
});

export default router;
