import {
  pgTable,
  text,
  boolean,
  integer,
  serial,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  status: text("status").notNull().default("pending"),
  isHidden: boolean("is_hidden").default(false),
  isPinned: boolean("is_pinned").default(false),
  isDeleted: boolean("is_deleted").default(false),
  likesCount: integer("likes_count").default(0),
  viewsCount: integer("views_count").default(0),
  answerLikesCount: integer("answer_likes_count").default(0),
  reactions: jsonb("reactions").default({
    heart: 0,
    laugh: 0,
    think: 0,
    gasp: 0,
    fire: 0,
  }),
  answerReactions: jsonb("answer_reactions").default({
    heart: 0,
    laugh: 0,
    think: 0,
    gasp: 0,
    fire: 0,
  }),
  number: serial("number").unique(),
  notifyHandle: text("notify_handle"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  answeredAt: timestamp("answeredAt", { withTimezone: true }),
});

export const designs = pgTable("designs", {
  id: text("id").primaryKey(),
  questionId: text("questionId"),
  questionText: text("questionText"),
  answerText: text("answerText"),
  text: text("text").notNull(),
  style: jsonb("style").notNull(),
  imageDataUrl: text("imageDataUrl"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
  stats: jsonb("stats").notNull().default({
    copies: 0,
    downloads: 0,
    shares: 0,
  }),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  questionId: text("questionId").notNull(),
  text: text("text").notNull(),
  author: text("author").default("Anonymous"),
  likesCount: integer("likes_count").default(0),
  reactions: jsonb("reactions").default({
    heart: 0,
    laugh: 0,
    think: 0,
    gasp: 0,
    fire: 0,
  }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
