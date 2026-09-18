import { supabase } from './supabase';

// Helper for handling Supabase errors
async function handleSupabase(promise) {
  const { data, error } = await promise;
  if (error) {
    console.error('Supabase Error:', error);
    throw new Error(error.message);
  }
  return data;
}

export async function getDesigns() {
  return handleSupabase(
    supabase
      .from('designs')
      .select('*')
      .order('updatedAt', { ascending: false })
  );
}

export async function deleteDesign(id) {
  const { error } = await supabase
    .from('designs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return getDesigns();
}

export async function saveDesigns(designs) {
  const { error } = await supabase
    .from('designs')
    .upsert(designs);
  
  if (error) throw new Error(error.message);
  return getDesigns();
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
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }));
  const fields = session
    ? '*'
    : 'id, question, status, is_hidden, is_pinned, is_deleted, likes_count, views_count, answer_likes_count, reactions, answer_reactions, createdAt, answeredAt';

  return handleSupabase(
    supabase
      .from('questions')
      .select(fields)
      .neq('is_deleted', true)
      .order('createdAt', { ascending: false })
  );
}

export async function getAdminQuestions() {
  return handleSupabase(
    supabase
      .from('questions')
      .select('*')
      .neq('is_deleted', true)
      .order('createdAt', { ascending: false })
  );
}

export async function addQuestion(questionText, notifyHandle = null) {
  const cleanQuestion = (questionText || '').trim();
  if (cleanQuestion.length < 4 || cleanQuestion.length > 500) {
    throw new Error('Question must be between 4 and 500 characters.');
  }

  const cleanHandle = notifyHandle ? String(notifyHandle).trim().replace(/^@+/, '') : null;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Generate clean 6-digit random number (100000 - 999999)
    const newId = Math.floor(100000 + Math.random() * 900000).toString();
    const newQuestion = {
      id: newId,
      question: cleanQuestion,
      status: 'pending',
      createdAt: new Date().toISOString(),
      notify_handle: cleanHandle,
    };

    const { error } = await supabase
      .from('questions')
      .insert([newQuestion]);

    if (!error) {
      return getQuestions();
    }

    // If duplicate key error (code 23505), retry with a new 6-digit code
    if (error.code === '23505' && attempt < maxRetries - 1) {
      continue;
    }

    throw new Error(error.message);
  }
}

export async function likeQuestion(id) {
  return reactToQuestion(id, 'heart', null);
}

export async function unlikeQuestion(id) {
  return reactToQuestion(id, null, 'heart');
}

export async function incrementQuestionView(id) {
  const { data, error } = await supabase.rpc('increment_question_view', {
    p_question_id: id,
  });

  if (error) {
    console.warn('RPC increment_question_view error:', error.message);
    return { views_count: 0 };
  }

  return { views_count: data };
}

export async function reactToQuestion(id, reactionType, previousReaction) {
  const { data, error } = await supabase.rpc('react_to_question', {
    p_question_id: id,
    p_reaction: reactionType,
    p_prev_reaction: previousReaction || null,
  });

  if (error) {
    console.error('RPC react_to_question error:', error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function reactToAnswer(id, reactionType, previousReaction) {
  const { data, error } = await supabase.rpc('react_to_answer', {
    p_question_id: id,
    p_reaction: reactionType,
    p_prev_reaction: previousReaction || null,
  });

  if (error) {
    console.error('RPC react_to_answer error:', error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function reactToComment(id, reactionType, previousReaction) {
  const { data, error } = await supabase.rpc('react_to_comment', {
    p_comment_id: id,
    p_reaction: reactionType,
    p_prev_reaction: previousReaction || null,
  });

  if (error) {
    console.error('RPC react_to_comment error:', error.message);
    throw new Error(error.message);
  }
  return data;
}

export async function likeAnswer(id) {
  return reactToAnswer(id, 'heart', null);
}

export async function unlikeAnswer(id) {
  return reactToAnswer(id, null, 'heart');
}

export async function toggleQuestionVisibility(id, isHidden) {
  const { data, error } = await supabase
    .from('questions')
    .update({ is_hidden: isHidden })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function toggleQuestionPin(id, isPinned) {
  const { data, error } = await supabase
    .from('questions')
    .update({ is_pinned: isPinned })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function softDeleteQuestion(id) {
  const { data, error } = await supabase
    .from('questions')
    .update({ is_deleted: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateQuestionDetails(id, fields) {
  const { data, error } = await supabase
    .from('questions')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveQuestions(questions) {
  const { error } = await supabase
    .from('questions')
    .upsert(questions);
  
  if (error) throw new Error(error.message);
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
  return handleSupabase(
    supabase
      .from('events')
      .select('*')
      .order('createdAt', { ascending: false })
  );
}

export async function addEvent(type, meta = {}) {
  const newEvent = {
    id: crypto.randomUUID(),
    type,
    meta,
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('events')
    .insert([newEvent]);

  if (error) throw new Error(error.message);
  return getEvents();
}

export async function getComments() {
  return handleSupabase(
    supabase
      .from('comments')
      .select('*')
      .order('createdAt', { ascending: true })
  );
}

export async function addComment(questionId, text) {
  const newComment = {
    id: crypto.randomUUID(),
    questionId,
    text,
    author: 'Anonymous',
    createdAt: new Date().toISOString(),
    likes_count: 0,
    reactions: { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 }
  };

  const { error } = await supabase
    .from('comments')
    .insert([newComment]);

  if (error) throw new Error(error.message);
  return newComment;
}

export async function likeComment(id) {
  return reactToComment(id, 'heart', null);
}

export async function unlikeComment(id) {
  return reactToComment(id, null, 'heart');
}
