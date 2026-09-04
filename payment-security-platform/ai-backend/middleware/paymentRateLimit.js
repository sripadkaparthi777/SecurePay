const buckets = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

export function paymentRateLimit(req, res, next) {
  const key = req.user?.userId || req.ip || "anonymous";
  const now = Date.now();

  let bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = {
      windowStart: now,
      count: 0,
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: "Too many payment requests. Please try again later.",
    });
  }

  next();
}
