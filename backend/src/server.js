import "./config/env.js";
import app from "./app.js";
import { pool } from "./db/index.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test Neon connection
    const client = await pool.connect();
    const result = await client.query("SELECT current_database(), now()");
    client.release();
    console.log(`✅ Connected to Neon Postgres database: ${result.rows[0].current_database}`);

    const server = app.listen(PORT, () => {
      console.log(`🚀 Ask Sila Backend Server listening on http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`💡 Tip: Run 'npx kill-port ${PORT}' or close the other process.`);
      } else {
        console.error("❌ Server error:", err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
