import { db, pool } from "../db/index.js";
import { comments } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

export function formatComment(c) {
  if (!c) return null;
  return {
    ...c,
    likes_count: c.likesCount ?? c.likes_count ?? 0,
  };
}

export async function getComments(req, res) {
  try {
    const { questionId } = req.query;

    let query = db.select().from(comments);
    if (questionId) {
      query = query.where(eq(comments.questionId, String(questionId)));
    }
    const rows = await query.orderBy(desc(comments.createdAt));

    return res.json({ ok: true, data: rows.map(formatComment) });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({ ok: false, message: "Failed to fetch comments." });
  }
}

export async function createComment(req, res) {
  try {
    const { questionId, text, author } = req.body;
    if (!questionId || !text) {
      return res.status(400).json({ ok: false, message: "questionId and text are required." });
    }

    const newId = crypto.randomUUID();
    const cleanText = text.trim();
    const cleanAuthor = (author || "Anonymous").trim().slice(0, 50);

    const [inserted] = await db
      .insert(comments)
      .values({
        id: newId,
        questionId: String(questionId),
        text: cleanText,
        author: cleanAuthor,
        likesCount: 0,
        reactions: { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 },
      })
      .returning();

    return res.status(201).json({ ok: true, data: inserted });
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({ ok: false, message: "Failed to create comment." });
  }
}

export async function reactToComment(req, res) {
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
        "SELECT reactions, likes_count FROM comments WHERE id = $1 FOR UPDATE",
        [id]
      );

      if (selectRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, message: "Comment not found." });
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
        'UPDATE comments SET reactions = $1, likes_count = $2 WHERE id = $3 RETURNING reactions, likes_count',
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
    console.error("Error reacting to comment:", error);
    return res.status(500).json({ ok: false, message: "Failed to update comment reaction." });
  }
}

export async function deleteComment(req, res) {
  const { id } = req.params;
  try {
    await db.delete(comments).where(eq(comments.id, id));
    return res.json({ ok: true, message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ ok: false, message: "Failed to delete comment." });
  }
}
