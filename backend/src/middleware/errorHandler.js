function errorHandler(err, req, res, next) {
  console.error("❌ API Error:", sanitizeError(err));

  if (err.code === "VALIDATION_ERROR") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
  }

  if (err.code === "INFEASIBLE_PLAN") {
    return res.status(422).json({ error: { code: "INFEASIBLE_PLAN", message: err.message } });
  }

  if (err.code === "RATE_LIMIT") {
    return res.status(429).json({ error: { code: "RATE_LIMIT", message: "Too many requests, slow down" } });
  }

  // default
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "Internal server error" } });
}

function sanitizeError(err) {
  // prevent logging sensitive details
  return {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  };
}

module.exports = errorHandler;
