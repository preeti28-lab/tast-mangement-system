export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not found: ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  // Mongoose schema validation -> 400 with per-field messages
  if (err.name === "ValidationError") {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    return res.status(400).json({ message: "Validation failed", errors });
  }
  // Malformed ObjectId or value of the wrong type
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  const status = err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  const isProd = process.env.NODE_ENV === "production";
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && isProd ? "Internal server error" : err.message,
    // Stack traces only for unexpected errors, and never in production.
    ...(status >= 500 && !isProd && { stack: err.stack }),
  });
};
