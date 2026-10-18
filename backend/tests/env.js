// Runs before each test file is loaded (app.js requires JWT_SECRET at import time).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_URL = "http://localhost:3000";
delete process.env.SMTP_HOST;
