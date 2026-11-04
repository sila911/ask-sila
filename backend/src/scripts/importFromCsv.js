import "../config/env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import { pool } from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

function safeJson(val, fallback) {
  if (!val || typeof val !== "string" || val.trim() === "") return fallback;
  try {
    return JSON.parse(val);
  } catch (err) {
    return fallback;
  }
}

function parseBool(val) {
  return val === "true" || val === true || val === "1" || val === 1;
}

function parseDate(val) {
  if (!val || typeof val !== "string" || val.trim() === "") return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

async function runCsvImport() {
  console.log("=================================================");
  console.log("🚀 Starting CSV Data Import into Neon PostgreSQL");
  console.log("=================================================");
  console.log(`📁 Source directory: ${DATA_DIR}`);
  console.log(`🐘 Neon database: ask_sila`);

  const client = await pool.connect();

  try {
    // 1. Clear initial dummy test records if present
    await client.query("DELETE FROM designs WHERE id = 'design-init-100001'");
    await client.query("DELETE FROM questions WHERE id = '100001'");
    console.log("🧹 Cleaned initial placeholder seed records.");

    // 2. Import Questions
    const questionsFile = path.join(DATA_DIR, "questions.csv");
    if (fs.existsSync(questionsFile)) {
      const raw = fs.readFileSync(questionsFile, "utf8");
      const records = parse(raw, { columns: true, skip_empty_lines: true });
      console.log(`\n⏳ Importing ${records.length} questions...`);

      const query = `
        INSERT INTO questions (
          id, question, status, is_hidden, is_pinned, is_deleted,
          likes_count, views_count, answer_likes_count,
          reactions, answer_reactions, number, notify_handle,
          "createdAt", "answeredAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
          number = EXCLUDED.number,
          notify_handle = EXCLUDED.notify_handle,
          "createdAt" = EXCLUDED."createdAt",
          "answeredAt" = EXCLUDED."answeredAt";
      `;

      let imported = 0;
      for (const r of records) {
        const id = r.id && r.id.trim() !== "" ? r.id.trim() : `legacy-q-${r.number || Date.now()}`;
        const numberVal = r.number && !isNaN(parseInt(r.number, 10)) ? parseInt(r.number, 10) : null;
        
        const values = [
          id,
          r.question || "",
          r.status || "pending",
          parseBool(r.is_hidden),
          parseBool(r.is_pinned),
          parseBool(r.is_deleted),
          parseInt(r.likes_count || "0", 10),
          parseInt(r.views_count || "0", 10),
          parseInt(r.answer_likes_count || "0", 10),
          safeJson(r.reactions, { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 }),
          safeJson(r.answer_reactions, { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 }),
          numberVal,
          r.notify_handle && r.notify_handle.trim() !== "" ? r.notify_handle.trim() : null,
          parseDate(r.createdAt) || new Date(),
          parseDate(r.answeredAt),
        ];

        await client.query(query, values);
        imported++;
      }
      console.log(`✅ Successfully imported ${imported} questions.`);

      // Sync serial sequence
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('questions', 'number'),
          COALESCE((SELECT MAX(number) FROM questions), 1)
        );
      `);
      console.log(`🔢 Synchronized questions number sequence to MAX.`);
    }

    // 3. Import Designs
    const designsFile = path.join(DATA_DIR, "designs.csv");
    if (fs.existsSync(designsFile)) {
      const raw = fs.readFileSync(designsFile, "utf8");
      const records = parse(raw, { columns: true, skip_empty_lines: true });
      console.log(`\n⏳ Importing ${records.length} designs...`);

      const query = `
        INSERT INTO designs (
          id, "questionId", "questionText", "answerText",
          text, style, "imageDataUrl", "createdAt", "updatedAt", stats
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          "questionId" = EXCLUDED."questionId",
          "questionText" = EXCLUDED."questionText",
          "answerText" = EXCLUDED."answerText",
          text = EXCLUDED.text,
          style = EXCLUDED.style,
          "imageDataUrl" = EXCLUDED."imageDataUrl",
          "createdAt" = EXCLUDED."createdAt",
          "updatedAt" = EXCLUDED."updatedAt",
          stats = EXCLUDED.stats;
      `;

      let imported = 0;
      for (const r of records) {
        const values = [
          r.id,
          r.questionId || null,
          r.questionText || null,
          r.answerText || null,
          r.text || "",
          safeJson(r.style, {}),
          r.imageDataUrl || null,
          parseDate(r.createdAt) || new Date(),
          parseDate(r.updatedAt) || new Date(),
          safeJson(r.stats, { copies: 0, downloads: 0, shares: 0 }),
        ];

        await client.query(query, values);
        imported++;
      }
      console.log(`✅ Successfully imported ${imported} designs.`);
    }

    // 4. Import Comments
    const commentsFile = path.join(DATA_DIR, "comments.csv");
    if (fs.existsSync(commentsFile)) {
      const raw = fs.readFileSync(commentsFile, "utf8");
      const records = parse(raw, { columns: true, skip_empty_lines: true });
      console.log(`\n⏳ Importing ${records.length} comments...`);

      const query = `
        INSERT INTO comments (
          id, "questionId", text, author, likes_count, reactions, "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          "questionId" = EXCLUDED."questionId",
          text = EXCLUDED.text,
          author = EXCLUDED.author,
          likes_count = EXCLUDED.likes_count,
          reactions = EXCLUDED.reactions,
          "createdAt" = EXCLUDED."createdAt";
      `;

      let imported = 0;
      for (const r of records) {
        const values = [
          r.id,
          r.questionId,
          r.text || "",
          r.author || "Anonymous",
          parseInt(r.likes_count || "0", 10),
          safeJson(r.reactions, { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 }),
          parseDate(r.createdAt) || new Date(),
        ];

        await client.query(query, values);
        imported++;
      }
      console.log(`✅ Successfully imported ${imported} comments.`);
    }

    // 5. Import Events
    const eventsFile = path.join(DATA_DIR, "events.csv");
    if (fs.existsSync(eventsFile)) {
      const raw = fs.readFileSync(eventsFile, "utf8");
      const records = parse(raw, { columns: true, skip_empty_lines: true });
      console.log(`\n⏳ Importing ${records.length} events...`);

      const query = `
        INSERT INTO events (
          id, type, meta, "createdAt"
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          meta = EXCLUDED.meta,
          "createdAt" = EXCLUDED."createdAt";
      `;

      let imported = 0;
      for (const r of records) {
        const values = [
          r.id,
          r.type || "unknown",
          safeJson(r.meta, {}),
          parseDate(r.createdAt) || new Date(),
        ];

        await client.query(query, values);
        imported++;
      }
      console.log(`✅ Successfully imported ${imported} events.`);
    }

    // Verification
    const statsRes = await client.query(`
      SELECT 
        (SELECT count(*) FROM questions) as total_questions,
        (SELECT count(*) FROM designs) as total_designs,
        (SELECT count(*) FROM comments) as total_comments,
        (SELECT count(*) FROM events) as total_events;
    `);

    console.log("\n=================================================");
    console.log("🎉 Migration Summary from CSV to Neon PostgreSQL:");
    console.log("=================================================");
    console.table(statsRes.rows[0]);
    console.log("=================================================\n");

  } catch (error) {
    console.error("❌ Fatal Error during CSV migration:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runCsvImport();
