import mongoose from "mongoose";

// Cached across requests so serverless invocations (Vercel) reuse one connection.
let connection = null;

const connectDB = () => {
  if (!connection) {
    if (!process.env.MONGODB_URI) {
      return Promise.reject(new Error("MONGODB_URI is not set"));
    }
    connection = mongoose
      .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .then((conn) => {
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        connection = null; // allow a retry on the next request
        throw error;
      });
  }
  return connection;
};

export default connectDB;
