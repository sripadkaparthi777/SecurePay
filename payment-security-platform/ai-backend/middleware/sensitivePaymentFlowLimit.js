const flowBuckets = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_FLOW_ATTEMPTS = 3;

// Used by security tests/scanner to clear previous request history
export function resetSensitivePaymentFlowForTests() {
  flowBuckets.clear();
}

// Limits sensitive payment-flow requests
export function sensitivePaymentFlowLimit(req, res, next) {
  const key = req.user?.userId || req.ip || "anonymous";
  const now = Date.now();

  let bucket = flowBuckets.get(key);

  // Start a new time window
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = {
      windowStart: now,
      count: 0,
    };
  }

  // Count this request
  bucket.count += 1;
  flowBuckets.set(key, bucket);

  // Allow only 3 requests within the window
  if (bucket.count > MAX_FLOW_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      error: "Too many sensitive payment attempts. Please try again later.",
      securityCategory: "API6",
    });
  }

  next();
}