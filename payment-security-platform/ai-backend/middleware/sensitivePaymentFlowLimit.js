const flowBuckets = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_FLOW_ATTEMPTS = 3;

export function sensitivePaymentFlowLimit(req, res, next) {
  const key = req.user?.userId || req.ip || "anonymous";
  const now = Date.now();

  let bucket = flowBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = {
      windowStart: now,
      count: 0,
    };
  }

  bucket.count += 1;
  flowBuckets.set(key, bucket);

  if (bucket.count > MAX_FLOW_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      error: "Too many sensitive payment attempts. Please try again later.",
      securityCategory: "API6",
    });
  }

  next();
}
