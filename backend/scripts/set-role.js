// Usage: npm run set-role -- <email> <admin|manager|user>
// Promotes or demotes a user directly in the database (e.g. to create the first admin
// for accounts that existed before roles were introduced).
import "dotenv/config";
import mongoose from "mongoose";
import User, { ROLES } from "../src/models/User.js";

const [email, role] = process.argv.slice(2);
if (!email || !ROLES.includes(role)) {
  console.error(`Usage: npm run set-role -- <email> <${ROLES.join("|")}>`);
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const user = await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { role },
  { returnDocument: "after" }
);
console.log(user ? `${user.email} is now ${user.role}` : `No user with email ${email}`);
await mongoose.disconnect();
