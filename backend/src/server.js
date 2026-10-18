// Local development entry point. On Vercel, src/app.js is used directly as a
// serverless function.
import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { maybeSendDueReminders } from "./services/reminderService.js";

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

// Check for tasks due within the hour, even when nobody has the app open.
setInterval(maybeSendDueReminders, 60 * 1000).unref();
maybeSendDueReminders();
