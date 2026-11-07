import "../config/env.js";
import { db } from "../db/index.js";
import { adminUsers } from "../db/schema.js";
import { hashPassword } from "../utils/security.js";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("❌ Both ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD environment variables are required.");
  process.exit(1);
}

async function seedAdmin() {
  console.log(`🔐 Seeding admin user for ${ADMIN_EMAIL}...`);

  try {
    const existing = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, ADMIN_EMAIL))
      .then((rows) => rows[0]);

    if (existing) {
      console.log(`ℹ️ Admin user ${ADMIN_EMAIL} already exists (ID: ${existing.id}).`);
      process.exit(0);
    }

    const hashed = await hashPassword(ADMIN_PASSWORD);
    const [created] = await db
      .insert(adminUsers)
      .values({
        email: ADMIN_EMAIL,
        passwordHash: hashed,
      })
      .returning();

    console.log(`✅ Admin user created successfully (ID: ${created.id}, Email: ${created.email})`);
    console.log(`🔑 Initial password set to: ${ADMIN_PASSWORD}`);
    console.log(`⚠️ Please log in and change your password in the dashboard.`);
  } catch (err) {
    console.error("❌ Failed to seed admin user:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
