import "../config/env.js";
import { pool } from "../db/index.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ebfrtusengramcaxlvek.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY is missing in your .env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrateTable(tableName, neonClient, insertQuery, mapRowFn) {
  console.log(`\n⏳ Fetching records from Supabase table: "${tableName}"...`);
  
  const { data, error } = await supabase.from(tableName).select("*");
  if (error) {
    console.error(`❌ Failed to fetch "${tableName}" from Supabase:`, error.message);
    if (error.message.includes("ENOTFOUND") || error.message.includes("fetch failed")) {
      console.warn(`💡 Tip: Your Supabase project appears to be paused. Log in to https://supabase.com/dashboard and click "Restore project" first.`);
    }
    return 0;
  }

  if (!data || data.length === 0) {
    console.log(`ℹ️ No rows found in Supabase table "${tableName}". Skipping.`);
    return 0;
  }

  console.log(`📥 Migrating ${data.length} rows into Neon table "${tableName}"...`);
  let migratedCount = 0;

  for (const row of data) {
    try {
      const values = mapRowFn(row);
      await neonClient.query(insertQuery, values);
      migratedCount++;
    } catch (err) {
      console.error(`⚠️ Error inserting row ${row.id} in ${tableName}:`, err.message);
    }
  }

  console.log(`✅ Successfully migrated ${migratedCount}/${data.length} rows into "${tableName}".`);
  return migratedCount;
}

async function runMigration() {
  console.log("=================================================");
  console.log("🚀 Starting Supabase ➡️ Neon Data Migration");
  console.log("=================================================");
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🐘 Neon Database: ${process.env.DATABASE_URL ? "Connected" : "Missing"}`);

  const neonClient = await pool.connect();

  try {
    // 1. Migrate Questions
    const questionInsert = `
      INSERT INTO questions (
        id, question, status, is_hidden, is_pinned, is_deleted,
        likes_count, views_count, answer_likes_count,
        reactions, answer_reactions, "createdAt", "answeredAt", notify_handle
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        question = EXCLUDED.question,
        status = EXCLUDED.status,
        is_hidden = EXCLUDED.is_hidden,
        is_pinned = EXCLUDED.is_pinned,
        is_deleted = EXCLUDED.is_deleted,
        likes_count = EXCLUDED.likes_count,
        views_count = EXCLUDED.views_count,
        answer_likes_count = EXCLUDED.answer_likes_count,
        reactions = EXCLUDED.reactions,
        answer_reactions = EXCLUDED.answer_reactions,
        "answeredAt" = EXCLUDED."answeredAt",
        notify_handle = EXCLUDED.notify_handle;
    `;

    await migrateTable("questions", neonClient, questionInsert, (q) => [
      q.id,
      q.question,
      q.status || "pending",
      q.is_hidden ?? false,
      q.is_pinned ?? false,
      q.is_deleted ?? false,
      q.likes_count || 0,
      q.views_count || 0,
      q.answer_likes_count || 0,
      JSON.stringify(q.reactions || {}),
      JSON.stringify(q.answer_reactions || {}),
      q.createdAt || new Date(),
      q.answeredAt || null,
      q.notify_handle || null,
    ]);

    // 2. Migrate Designs
    const designInsert = `
      INSERT INTO designs (
        id, "questionId", "questionText", "answerText",
        text, style, "imageDataUrl", "createdAt", "updatedAt", stats
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        text = EXCLUDED.text,
        style = EXCLUDED.style,
        "imageDataUrl" = EXCLUDED."imageDataUrl",
        "updatedAt" = EXCLUDED."updatedAt",
        stats = EXCLUDED.stats;
    `;

    await migrateTable("designs", neonClient, designInsert, (d) => [
      d.id,
      d.questionId || null,
      d.questionText || null,
      d.answerText || null,
      d.text,
      JSON.stringify(d.style || {}),
      d.imageDataUrl || null,
      d.createdAt || new Date(),
      d.updatedAt || new Date(),
      JSON.stringify(d.stats || {}),
    ]);

    // 3. Migrate Comments
    const commentInsert = `
      INSERT INTO comments (
        id, "questionId", text, author, likes_count, reactions, "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING;
    `;

    await migrateTable("comments", neonClient, commentInsert, (c) => [
      c.id,
      c.questionId,
      c.text,
      c.author || "Anonymous",
      c.likes_count || 0,
      JSON.stringify(c.reactions || {}),
      c.createdAt || new Date(),
    ]);

    // 4. Migrate Events
    const eventInsert = `
      INSERT INTO events (
        id, type, meta, "createdAt"
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING;
    `;

    await migrateTable("events", neonClient, eventInsert, (e) => [
      e.id,
      e.type,
      JSON.stringify(e.meta || {}),
      e.createdAt || new Date(),
    ]);

    console.log("\n=================================================");
    console.log("🎉 Migration process completed successfully!");
    console.log("=================================================");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    neonClient.release();
    process.exit(0);
  }
}

runMigration();
