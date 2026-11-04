import { apiRequest } from "./apiClient";

export async function getDesigns() {
  const res = await apiRequest("/designs");
  return res.data || [];
}

export async function deleteDesign(id) {
  await apiRequest(`/designs/${id}`, { method: "DELETE" });
  return getDesigns();
}

export async function saveDesigns(designs) {
  const res = await apiRequest("/designs", {
    method: "POST",
    body: designs,
  });
  return res.data || [];
}

export function createDesign({ text, style, imageDataUrl }) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    text,
    style,
    imageDataUrl: imageDataUrl || "",
    createdAt: now,
    updatedAt: now,
    stats: {
      copies: 0,
      downloads: 0,
      shares: 0,
    },
  };
}

export async function getQuestions() {
  const res = await apiRequest("/questions");
  return res.data || [];
}

export async function getAdminQuestions() {
  const res = await apiRequest("/questions/admin");
  return res.data || [];
}

export async function addQuestion(questionText, notifyHandle = null) {
  const cleanQuestion = (questionText || "").trim();
  if (cleanQuestion.length < 4 || cleanQuestion.length > 500) {
    throw new Error("Question must be between 4 and 500 characters.");
  }

  const cleanHandle = notifyHandle ? String(notifyHandle).trim().replace(/^@+/, "") : null;

  const res = await apiRequest("/questions", {
    method: "POST",
    body: {
      question: cleanQuestion,
      notifyHandle: cleanHandle,
    },
  });

  return res.data;
}

export async function likeQuestion(id) {
  return reactToQuestion(id, "heart", null);
}

export async function unlikeQuestion(id) {
  return reactToQuestion(id, null, "heart");
}

export async function incrementQuestionView(id) {
  try {
    const res = await apiRequest(`/questions/${id}/view`, { method: "POST" });
    return { views_count: res.views_count || 0 };
  } catch (error) {
    console.warn("Increment question view error:", error.message);
    return { views_count: 0 };
  }
}

export async function reactToQuestion(id, reactionType, previousReaction) {
  const res = await apiRequest(`/questions/${id}/react`, {
    method: "POST",
    body: { reactionType, previousReaction },
  });
  return res;
}

export async function reactToAnswer(id, reactionType, previousReaction) {
  const res = await apiRequest(`/questions/${id}/react-answer`, {
    method: "POST",
    body: { reactionType, previousReaction },
  });
  return res;
}

export async function reactToComment(id, reactionType, previousReaction) {
  const res = await apiRequest(`/comments/${id}/react`, {
    method: "POST",
    body: { reactionType, previousReaction },
  });
  return res;
}

export async function likeAnswer(id) {
  return reactToAnswer(id, "heart", null);
}

export async function unlikeAnswer(id) {
  return reactToAnswer(id, null, "heart");
}

export async function toggleQuestionVisibility(id, isHidden) {
  const res = await apiRequest(`/questions/${id}`, {
    method: "PATCH",
    body: { is_hidden: isHidden },
  });
  return res.data;
}

export async function toggleQuestionPin(id, isPinned) {
  const res = await apiRequest(`/questions/${id}`, {
    method: "PATCH",
    body: { is_pinned: isPinned },
  });
  return res.data;
}

export async function softDeleteQuestion(id) {
  const res = await apiRequest(`/questions/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

export async function updateQuestionDetails(id, fields) {
  const res = await apiRequest(`/questions/${id}`, {
    method: "PATCH",
    body: fields,
  });
  return res.data;
}

export async function saveQuestions(questions) {
  // Update details for each question
  for (const q of questions) {
    if (q.id) {
      await updateQuestionDetails(q.id, q);
    }
  }
  return getQuestions();
}

export function createQuestion(question) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    question,
    status: "pending",
    createdAt: now,
    answeredAt: null,
  };
}

export function markQuestionAnswered(questions, questionId) {
  const now = new Date().toISOString();
  return questions.map((item) => {
    if (item.id !== questionId) return item;
    return {
      ...item,
      status: "answered",
      answeredAt: now,
    };
  });
}

export async function getEvents() {
  const res = await apiRequest("/events");
  return res.data || [];
}

export async function addEvent(type, meta = {}) {
  const res = await apiRequest("/events", {
    method: "POST",
    body: { type, meta },
  });
  return res.data;
}

export async function getComments() {
  const res = await apiRequest("/comments");
  return res.data || [];
}

export async function addComment(questionId, text) {
  const res = await apiRequest("/comments", {
    method: "POST",
    body: { questionId, text },
  });
  return res.data;
}

export async function likeComment(id) {
  return reactToComment(id, "heart", null);
}

export async function unlikeComment(id) {
  return reactToComment(id, null, "heart");
}
