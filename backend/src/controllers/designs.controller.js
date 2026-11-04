import { db } from "../db/index.js";
import { designs } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export async function getDesigns(req, res) {
  try {
    const rows = await db
      .select()
      .from(designs)
      .orderBy(desc(designs.updatedAt));

    return res.json({ ok: true, data: rows });
  } catch (error) {
    console.error("Error fetching designs:", error);
    return res.status(500).json({ ok: false, message: "Failed to fetch designs." });
  }
}

export async function saveDesigns(req, res) {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    const results = [];
    for (const item of payload) {
      const designId = item.id || crypto.randomUUID();
      const now = new Date();

      const [upserted] = await db
        .insert(designs)
        .values({
          id: designId,
          questionId: item.questionId || null,
          questionText: item.questionText || null,
          answerText: item.answerText || null,
          text: item.text,
          style: item.style,
          imageDataUrl: item.imageDataUrl || null,
          createdAt: item.createdAt ? new Date(item.createdAt) : now,
          updatedAt: now,
          stats: item.stats || { copies: 0, downloads: 0, shares: 0 },
        })
        .onConflictDoUpdate({
          target: designs.id,
          set: {
            text: item.text,
            style: item.style,
            imageDataUrl: item.imageDataUrl || null,
            updatedAt: now,
            stats: item.stats || { copies: 0, downloads: 0, shares: 0 },
          },
        })
        .returning();

      results.push(upserted);
    }

    return res.json({ ok: true, data: results });
  } catch (error) {
    console.error("Error saving designs:", error);
    return res.status(500).json({ ok: false, message: "Failed to save designs." });
  }
}

export async function deleteDesign(req, res) {
  const { id } = req.params;
  try {
    await db.delete(designs).where(eq(designs.id, id));
    return res.json({ ok: true, message: "Design deleted." });
  } catch (error) {
    console.error("Error deleting design:", error);
    return res.status(500).json({ ok: false, message: "Failed to delete design." });
  }
}
