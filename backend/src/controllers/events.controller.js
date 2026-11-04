import { db } from "../db/index.js";
import { events } from "../db/schema.js";
import { desc } from "drizzle-orm";
import crypto from "crypto";

export async function getEvents(req, res) {
  try {
    const rows = await db
      .select()
      .from(events)
      .orderBy(desc(events.createdAt));

    return res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ ok: false, message: "Failed to fetch events." });
  }
}

export async function createEvent(req, res) {
  try {
    const { type, meta } = req.body;
    if (!type) {
      return res.status(400).json({ ok: false, message: "Event type is required." });
    }

    const [inserted] = await db
      .insert(events)
      .values({
        id: crypto.randomUUID(),
        type,
        meta: meta || {},
      })
      .returning();

    return res.status(201).json({ ok: true, data: inserted });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({ ok: false, message: "Failed to create event." });
  }
}
