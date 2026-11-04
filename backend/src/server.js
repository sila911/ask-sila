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

    app.listen(PORT, () => {
      console.log(`🚀 Ask Sila Backend Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
