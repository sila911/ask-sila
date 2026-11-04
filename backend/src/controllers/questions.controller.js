import { db, pool } from "../db/index.js";
import { questions } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendTelegramMessage } from "../utils/telegram.js";

export function formatQuestion(q) {
  if (!q) return null;
  return {
    ...q,
    likes_count: q.likesCount ?? q.likes_count ?? 0,
    views_count: q.viewsCount ?? q.views_count ?? 0,
    answer_likes_count: q.answerLikesCount ?? q.answer_likes_count ?? 0,
    is_hidden: q.isHidden ?? q.is_hidden ?? false,
    is_pinned: q.isPinned ?? q.is_pinned ?? false,
    is_deleted: q.isDeleted ?? q.is_deleted ?? false,
    notify_handle: q.notifyHandle ?? q.notify_handle ?? null,
  };
}

export async function getQuestions(req, res) {
  try {
    // If admin is authenticated via cookie/header, show non-deleted questions
    const isAdmin = Boolean(req.admin);

    const query = db
      .select()
      .from(questions)
      .where(
        isAdmin
          ? eq(questions.isDeleted, false)
          : and(eq(questions.isDeleted, false), eq(questions.isHidden, false))
      )
      .orderBy(desc(questions.isPinned), desc(questions.createdAt));

    const rows = await query;
    return res.json({ ok: true, data: rows.map(formatQuestion) });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({ ok: false, message: "Failed to fetch questions." });
  }
}

export async function getAdminQuestions(req, res) {
  try {
    const rows = await db
      .select()
      .from(questions)
      .where(eq(questions.isDeleted, false))
      .orderBy(desc(questions.createdAt));

    return res.json({ ok: true, data: rows.map(formatQuestion) });
  } catch (error) {
    console.error("Error fetching admin questions:", error);
    return res.status(500).json({ ok: false, message: "Failed to fetch questions." });
  }
}

export async function createQuestion(req, res) {
  try {
    const { question: rawQuestion, notifyHandle } = req.body;
    const cleanQuestion = (rawQuestion || "").trim();
    const cleanHandle = notifyHandle
      ? String(notifyHandle).trim().replace(/^@+/, "")
      : null;

    // Generate random 6-digit ID (matching existing format)
    const newId = Math.floor(100000 + Math.random() * 900000).toString();

    const [inserted] = await db
      .insert(questions)
      .values({
        id: newId,
        question: cleanQuestion,
        status: "pending",
        notifyHandle: cleanHandle,
        reactions: { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 },
        answerReactions: { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 },
      })
      .returning();

    // Async Telegram Notification
    sendTelegramMessage(
      `📬 <b>New Question on Ask Sila!</b>\n\n` +
      `<b>Question:</b> "${cleanQuestion}"\n` +
      `<b>From:</b> ${cleanHandle ? `@${cleanHandle}` : "Anonymous"}\n` +
      `<b>ID:</b> <code>#${newId}</code>`
    ).catch((err) => console.error("Telegram notification error:", err));

    return res.status(201).json({ ok: true, data: inserted });
  } catch (error) {
    console.error("Error creating question:", error);
    return res.status(500).json({ ok: false, message: "Failed to create question." });
  }
}

export async function reactToQuestion(req, res) {
  const { id } = req.params;
  const { reactionType, previousReaction } = req.body;

  const validReactions = ["heart", "laugh", "think", "gasp", "fire"];
  if (reactionType && !validReactions.includes(reactionType)) {
    return res.status(400).json({ ok: false, message: "Invalid reaction type." });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const selectRes = await client.query(
        "SELECT reactions, likes_count FROM questions WHERE id = $1 FOR UPDATE",
        [id]
      );

      if (selectRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, message: "Question not found." });
      }

      let currReactions = selectRes.rows[0].reactions || {
        heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0,
      };

      if (previousReaction && currReactions[previousReaction] !== undefined) {
        currReactions[previousReaction] = Math.max(0, (currReactions[previousReaction] || 0) - 1);
      }

      if (reactionType && currReactions[reactionType] !== undefined) {
        currReactions[reactionType] = (currReactions[reactionType] || 0) + 1;
      }

      const totalLikes = Object.values(currReactions).reduce((acc, val) => acc + (Number(val) || 0), 0);

      const updateRes = await client.query(
        'UPDATE questions SET reactions = $1, likes_count = $2 WHERE id = $3 RETURNING reactions, likes_count',
        [JSON.stringify(currReactions), totalLikes, id]
      );

      await client.query("COMMIT");
      return res.json({
        ok: true,
        reactions: updateRes.rows[0].reactions,
        likes_count: updateRes.rows[0].likes_count,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error reacting to question:", error);
    return res.status(500).json({ ok: false, message: "Failed to update reaction." });
  }
}

export async function reactToAnswer(req, res) {
  const { id } = req.params;
  const { reactionType, previousReaction } = req.body;

  const validReactions = ["heart", "laugh", "think", "gasp", "fire"];
  if (reactionType && !validReactions.includes(reactionType)) {
    return res.status(400).json({ ok: false, message: "Invalid reaction type." });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const selectRes = await client.query(
        "SELECT answer_reactions, answer_likes_count FROM questions WHERE id = $1 FOR UPDATE",
        [id]
      );

      if (selectRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, message: "Question not found." });
      }

      let currReactions = selectRes.rows[0].answer_reactions || {
        heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0,
      };

      if (previousReaction && currReactions[previousReaction] !== undefined) {
        currReactions[previousReaction] = Math.max(0, (currReactions[previousReaction] || 0) - 1);
      }

      if (reactionType && currReactions[reactionType] !== undefined) {
        currReactions[reactionType] = (currReactions[reactionType] || 0) + 1;
      }

      const totalLikes = Object.values(currReactions).reduce((acc, val) => acc + (Number(val) || 0), 0);

      const updateRes = await client.query(
        'UPDATE questions SET answer_reactions = $1, answer_likes_count = $2 WHERE id = $3 RETURNING answer_reactions, answer_likes_count',
        [JSON.stringify(currReactions), totalLikes, id]
      );

      await client.query("COMMIT");
      return res.json({
        ok: true,
        answer_reactions: updateRes.rows[0].answer_reactions,
        answer_likes_count: updateRes.rows[0].answer_likes_count,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error reacting to answer:", error);
    return res.status(500).json({ ok: false, message: "Failed to update answer reaction." });
  }
}

export async function incrementView(req, res) {
  const { id } = req.params;
  try {
    const [updated] = await db
      .update(questions)
      .set({
        viewsCount: sql`${questions.viewsCount} + 1`,
      })
      .where(and(eq(questions.id, id), eq(questions.isDeleted, false)))
      .returning({ viewsCount: questions.viewsCount });

    return res.json({ ok: true, views_count: updated?.viewsCount || 0 });
  } catch (error) {
    console.error("Error incrementing view:", error);
    return res.status(500).json({ ok: false, message: "Failed to increment view." });
  }
}

export async function updateQuestion(req, res) {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatePayload = {};
    if (typeof updates.is_hidden === "boolean") updatePayload.isHidden = updates.is_hidden;
    if (typeof updates.is_pinned === "boolean") updatePayload.isPinned = updates.is_pinned;
    if (typeof updates.is_deleted === "boolean") updatePayload.isDeleted = updates.is_deleted;
    if (updates.status) updatePayload.status = updates.status;
    if (updates.answeredAt) updatePayload.answeredAt = new Date(updates.answeredAt);
    if (updates.question) updatePayload.question = updates.question;

    const [updated] = await db
      .update(questions)
      .set(updatePayload)
      .where(eq(questions.id, id))
      .returning();

    return res.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Error updating question:", error);
    return res.status(500).json({ ok: false, message: "Failed to update question." });
  }
}

export async function deleteQuestion(req, res) {
  const { id } = req.params;
  try {
    // Soft delete to preserve history
    const [updated] = await db
      .update(questions)
      .set({ isDeleted: true })
      .where(eq(questions.id, id))
      .returning();

    return res.json({ ok: true, data: updated, message: "Question soft-deleted." });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res.status(500).json({ ok: false, message: "Failed to delete question." });
  }
}
