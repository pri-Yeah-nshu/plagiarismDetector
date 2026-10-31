import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";
import { ensureTeacherAccount } from "../src/services/auth.service.js";

// Reuse the DB connection and one-time setup across warm invocations.
let ready;
const init = () => {
  if (!ready) {
    ready = (async () => {
      await connectDB();
      await ensureTeacherAccount();
    })().catch((err) => {
      ready = null; // retry on next request
      throw err;
    });
  }
  return ready;
};

export default async function handler(req, res) {
  try {
    await init();
  } catch (err) {
    console.error("Startup failed:", err.message);
    return res.status(500).json({ success: false, message: "Server failed to start" });
  }
  return app(req, res);
}
