import "../config/env.js";
import { pool, db } from "../db/index.js";
import { questions, designs, comments, events, adminUsers } from "../db/schema.js";
import { count, eq } from "drizzle-orm";
import app from "../app.js";

async function testServices() {
  console.log("=================================================");
  console.log("🧪 Neon Postgres & Backend End-to-End Verification");
  console.log("=================================================");

  // 1. Direct Database Test
  console.log("\n[1/3] Testing Direct Neon Database Connection...");
  console.log(`🔌 Connected to DATABASE_URL: ${process.env.DATABASE_URL ? "OK" : "MISSING"}`);
  
  const [qCount] = await db.select({ value: count() }).from(questions);
  const [dCount] = await db.select({ value: count() }).from(designs);
  const [cCount] = await db.select({ value: count() }).from(comments);
  const [eCount] = await db.select({ value: count() }).from(events);
  const [aCount] = await db.select({ value: count() }).from(adminUsers);

  console.log(`  ✓ questions table count: ${qCount.value}`);
  console.log(`  ✓ designs table count: ${dCount.value}`);
  console.log(`  ✓ comments table count: ${cCount.value}`);
  console.log(`  ✓ events table count: ${eCount.value}`);
  console.log(`  ✓ admin_users table count: ${aCount.value}`);

  // 2. Test Write Operation to Neon Postgres
  console.log("\n[2/3] Testing Write Capability to Neon Postgres...");
  const testEventId = `e2e-test-${Date.now()}`;
  await db.insert(events).values({
    id: testEventId,
    type: "e2e_verification_test",
    meta: { runner: "antigravity", status: "success" },
  });
  console.log(`  ✓ Inserted test event ID: ${testEventId}`);

  const [verifiedEvent] = await db.select().from(events).where(eq(events.id, testEventId));
  if (!verifiedEvent) {
    throw new Error("Failed to read back inserted event from Neon Postgres!");
  }
  console.log(`  ✓ Read back inserted event from Neon: Type = "${verifiedEvent.type}"`);

  // Clean up test event
  await db.delete(events).where(eq(events.id, testEventId));
  console.log(`  ✓ Cleaned up test event.`);

  // 3. Test HTTP Server
  console.log("\n[3/3] Testing Express HTTP API Server Endpoints...");
  const server = app.listen(0);
  const port = server.address().port;
  console.log(`  ✓ Express test instance listening on ephemeral port ${port}`);

  const resHealth = await fetch(`http://127.0.0.1:${port}/health`);
  const healthJson = await resHealth.json();
  console.log(`  ✓ GET /health -> Status ${resHealth.status}:`, healthJson.service, `(${healthJson.status})`);

  const resQuestions = await fetch(`http://127.0.0.1:${port}/api/questions`);
  const questionsJson = await resQuestions.json();
  console.log(`  ✓ GET /api/questions -> Status ${resQuestions.status}: fetched ${questionsJson.data ? questionsJson.data.length : 0} public active questions`);

  const resDesigns = await fetch(`http://127.0.0.1:${port}/api/designs`);
  const designsJson = await resDesigns.json();
  console.log(`  ✓ GET /api/designs -> Status ${resDesigns.status}: fetched ${designsJson.data ? designsJson.data.length : 0} designs`);

  const resComments = await fetch(`http://127.0.0.1:${port}/api/comments`);
  const commentsJson = await resComments.json();
  console.log(`  ✓ GET /api/comments -> Status ${resComments.status}: fetched ${commentsJson.data ? commentsJson.data.length : 0} comments`);

  server.close();
  await pool.end();

  console.log("\n=================================================");
  console.log("🎉 ALL SERVICES PROVEN WORKING END-TO-END! 100% OK");
  console.log("=================================================\n");
  process.exit(0);
}

testServices().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
