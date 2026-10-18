// Local development entry point. On Vercel, src/app.js is used directly as a
// serverless function.
import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
} catch (error) {
  console.error(`MongoDB connection error: ${error.message}`);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
