import { useState, useMemo, useEffect } from "react";
import {
  addEvent,
  addQuestion,
  getDesigns,
  getEvents,
  getQuestions,
  getComments,
  addComment,
  incrementQuestionView,
  markQuestionAnswered,
  saveDesigns,
  saveQuestions,
  toggleQuestionVisibility,
  toggleQuestionPin,
  softDeleteQuestion,
  updateQuestionDetails,
  deleteDesign,
} from "../lib/storage";

/**
 * Manages all application data: questions, designs, events, comments,
 * real-time subscriptions, and CRUD handlers.
 */
export function useAppData(showAdminToast) {
  const [designs, setDesigns] = useState([]);
  const [events, setEvents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [comments, setComments] = useState([]);
  const [seedDesign, setSeedDesign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [hasNewQuestions, setHasNewQuestions] = useState(false);
  const [hasAskedQuestion, setHasAskedQuestion] = useState(() => {
    try {
      return localStorage.getItem("hasAskedQuestion") === "true";
    } catch {
      return false;
    }
  });

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setFetchError(null);
    try {
      const [nextDesigns, nextEvents, nextQuestions, nextComments] = await Promise.all([
        getDesigns(),
        getEvents(),
        getQuestions(),
        getComments(),
      ]);
      setDesigns(nextDesigns);
      setEvents(nextEvents);
      setQuestions(nextQuestions);
      setComments(nextComments);
      setHasNewQuestions(false);
    } catch (error) {
      console.error(error);
      setFetchError("Failed to connect to database. Please check your internet.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Background refresh every 25 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 25000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ─── Derived state ───────────────────────────────────────────────────────────

  const orderedDesigns = useMemo(() => {
    return [...designs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [designs]);

  const publicQuestions = useMemo(() => {
    return questions.filter((q) => !q.is_hidden);
  }, [questions]);

  // ─── Event tracking ──────────────────────────────────────────────────────────

  const trackEvent = async (type, meta = {}) => {
    try {
      const nextEvents = await addEvent(type, meta);
      setEvents(nextEvents);
    } catch (error) {
      console.error(error);
    }
  };

  // ─── Questions ───────────────────────────────────────────────────────────────

  const submitUserQuestion = async (questionText, notifyHandle = null) => {
    try {
      const persisted = await addQuestion(questionText, notifyHandle);
      const newQuestionObj = Array.isArray(persisted) ? persisted[0] : persisted;

      const formatted = newQuestionObj
        ? {
            ...newQuestionObj,
            likes_count: newQuestionObj.likesCount ?? newQuestionObj.likes_count ?? 0,
            views_count: newQuestionObj.viewsCount ?? newQuestionObj.views_count ?? 0,
            answer_likes_count:
              newQuestionObj.answerLikesCount ?? newQuestionObj.answer_likes_count ?? 0,
            is_hidden: newQuestionObj.isHidden ?? newQuestionObj.is_hidden ?? false,
            is_pinned: newQuestionObj.isPinned ?? newQuestionObj.is_pinned ?? false,
            is_deleted: newQuestionObj.isDeleted ?? newQuestionObj.is_deleted ?? false,
            notify_handle:
              newQuestionObj.notifyHandle ?? newQuestionObj.notify_handle ?? null,
          }
        : null;

      if (formatted) {
        setQuestions((prev) => {
          const currentList = Array.isArray(prev) ? prev : [];
          if (currentList.some((q) => q.id === formatted.id)) return currentList;
          return [formatted, ...currentList];
        });
      }

      trackEvent("question_submitted");
      setHasAskedQuestion(true);
      localStorage.setItem("hasAskedQuestion", "true");

      return formatted;
    } catch (error) {
      console.error("submitUserQuestion error:", error);
      throw error;
    }
  };

  const handleAddComment = async (questionId, text) => {
    try {
      const newComment = await addComment(questionId, text);
      setComments((prev) => [...prev, newComment]);
      trackEvent("comment_added", { questionId });
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleView = async (id) => {
    try {
      const data = await incrementQuestionView(id);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, views_count: data.views_count } : q))
      );
    } catch (error) {
      console.error("Failed to increment view:", error);
    }
  };

  const markAnswered = async (questionId) => {
    const next = markQuestionAnswered(questions, questionId);
    const persisted = await saveQuestions(next);
    setQuestions(persisted);
    trackEvent("question_answered", { questionId });
    showAdminToast("Question marked answered", "Question status updated in inbox.", "info");
  };

  // ─── Admin question moderation ───────────────────────────────────────────────

  const handleToggleVisibility = async (id, isHidden) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, is_hidden: isHidden } : q))
    );
    try {
      await toggleQuestionVisibility(id, isHidden);
      showAdminToast(
        isHidden ? "Question Hidden" : "Question Visible",
        "Visibility updated successfully.",
        "info"
      );
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, is_hidden: !isHidden } : q))
      );
      showAdminToast("Update failed", error.message, "error");
    }
  };

  const handleTogglePin = async (id, isPinned) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, is_pinned: isPinned } : q))
    );
    try {
      await toggleQuestionPin(id, isPinned);
      showAdminToast(
        isPinned ? "Question Pinned" : "Question Unpinned",
        "Pin status updated successfully.",
        "info"
      );
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, is_pinned: !isPinned } : q))
      );
      showAdminToast("Update failed", error.message, "error");
    }
  };

  const handleSoftDelete = async (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    try {
      await softDeleteQuestion(id);
      showAdminToast("Question Deleted", "The question has been moved to trash.", "info");
    } catch (error) {
      console.error("Failed to delete question:", error);
      loadData(true);
      showAdminToast("Delete failed", error.message, "error");
    }
  };

  const handleUpdateQuestion = async (id, fields) => {
    try {
      const updated = await updateQuestionDetails(id, fields);
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
      );
      showAdminToast("Question Updated", "Question details saved successfully.", "success");
      return { ok: true, data: updated };
    } catch (error) {
      console.error("Failed to update question:", error);
      showAdminToast("Update failed", error.message, "error");
      return { ok: false, error };
    }
  };

  // ─── Designs ─────────────────────────────────────────────────────────────────

  const addDesign = async (design) => {
    const next = [design, ...designs];
    const persisted = await saveDesigns(next);
    setDesigns(persisted);
  };

  const removeDesign = async (id) => {
    try {
      const persisted = await deleteDesign(id);
      setDesigns(persisted);
      trackEvent("design_deleted");
      showAdminToast("Deleted", "Answer card removed from library.", "info");
    } catch (error) {
      console.error(error);
      showAdminToast("Delete failed", "Could not remove answer card from database.", "error");
    }
  };

  const reuseDesign = (design, changeTabWithDirection) => {
    setSeedDesign(design);
    changeTabWithDirection("create");
    trackEvent("design_reused", { id: design.id });
    showAdminToast("Loaded in editor", "Answer card opened for update.", "success");
  };

  return {
    // State
    designs,
    events,
    questions,
    setQuestions,
    comments,
    setComments,
    seedDesign,
    setSeedDesign,
    isLoading,
    fetchError,
    hasNewQuestions,
    hasAskedQuestion,
    orderedDesigns,
    publicQuestions,
    // Handlers
    loadData,
    trackEvent,
    submitUserQuestion,
    handleAddComment,
    handleView,
    markAnswered,
    handleToggleVisibility,
    handleTogglePin,
    handleSoftDelete,
    handleUpdateQuestion,
    addDesign,
    removeDesign,
    reuseDesign,
  };
}
