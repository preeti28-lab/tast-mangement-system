// Long-running server entry point (local development and Render).
// It serves the REST API and the Socket.io realtime server on the same port.
// On Vercel, src/app.js is used directly as a serverless function (no sockets).
import "dotenv/config";
import http from "node:http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { attachSocketServer } from "./realtime/socketServer.js";

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
} catch (error) {
  console.error(`MongoDB connection error: ${error.message}`);
  process.exit(1);
}

const server = http.createServer(app);
attachSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
