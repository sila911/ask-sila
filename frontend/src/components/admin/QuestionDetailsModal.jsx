import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Telegram } from "developer-icons";
import {
  ArrowLeft2,
  Eye,
  EyeSlash,
  Copy,
  Notification,
  Clock,
  Heart,
  MessageText,
  AttachSquare,
  TickCircle,
  ExportSquare,
} from "iconsax-react";
import QuestionActionMenu from "./QuestionActionMenu";

export default function QuestionDetailsModal({
  isOpen,
  onClose,
  question,
  comments = [],
  onToggleVisibility,
  onTogglePin,
  onEdit,
  onAnswer,
  onDelete,
  showAdminToast,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!shouldRender || !question) return null;

  const questionComments = comments.filter((c) => c.questionId === question.id);
  const reactions = question.reactions || {};
  const totalReactions = Object.values(reactions).reduce((a, b) => a + (b || 0), 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(question.question);
    if (showAdminToast) {
      showAdminToast("Copied to clipboard", "Question text copied.", "success");
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] bg-[#0c1626] dark:bg-[#070e18] flex flex-col w-full h-full min-h-screen overflow-y-auto text-slate-100 transition-all duration-300 ease-out ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
      }`}
    >
      {/* Full-Screen Top Navigation Bar: [< Question Details] and 3-Dot Action Menu */}
      <header className="sticky top-0 z-30 w-full bg-[#0c1626]/90 dark:bg-[#070e18]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        {/* Back Button & Title */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-slate-100 hover:text-cyan-400 transition-colors group cursor-pointer"
          aria-label="Back to questions table"
        >
          <span className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
            <ArrowLeft2 size={18} className="transition-transform group-hover:-translate-x-0.5" />
          </span>
          <h1 className="text-base sm:text-lg font-bold font-['Racing_Sans_One',sans-serif] tracking-wide">
            Question Details
          </h1>
        </button>

        {/* Top Right: 3-Dot Action Menu */}
        <div className="flex items-center">
          <QuestionActionMenu
            question={question}
            hideDetailsOption={true}
            onToggleVisibility={onToggleVisibility}
            onTogglePin={onTogglePin}
            onEdit={(q) => {
              onClose();
              if (onEdit) onEdit(q);
            }}
            onAnswer={(q) => {
              onClose();
              if (onAnswer) onAnswer(q);
            }}
            onDelete={(q) => {
              onClose();
              if (onDelete) onDelete(q);
            }}
            onCopy={handleCopy}
          />
        </div>
      </header>

      {/* Main Full-Screen Body Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Question Hero Card */}
        <div className="relative rounded-3xl bg-white/5 border border-white/15 p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between min-h-[160px]">
          {/* Header row: Question ID & Badges in one line */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              Question #{question.id}
            </span>
            {question.is_pinned && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AttachSquare size={13} variant="Bold" />
                Pinned
              </span>
            )}
          </div>

          {/* Question text */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-50 leading-relaxed break-words cause-medium pr-10 mb-4">
            "{question.question}"
          </h2>

          {/* Bottom Right: Copy icon only button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
              title="Copy question text"
              aria-label="Copy question"
            >
              <Copy size={17} />
            </button>
          </div>
        </div>

        {/* Status & Moderation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Status */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Status
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                question.status === "answered"
                  ? "bg-green-500/15 text-green-400 border border-green-500/25"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
              }`}
            >
              <TickCircle size={14} variant="Bold" />
              {question.status}
            </span>
          </div>

          {/* Visibility */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Visibility
            </span>
            <button
              type="button"
              onClick={() =>
                onToggleVisibility &&
                onToggleVisibility(question.id, !question.is_hidden)
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !question.is_hidden
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25"
                  : "bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25"
              }`}
            >
              {!question.is_hidden ? (
                <>
                  <Eye size={14} />
                  Public
                </>
              ) : (
                <>
                  <EyeSlash size={14} />
                  Private
                </>
              )}
            </button>
          </div>

          {/* Pin */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Pin State
            </span>
            <button
              type="button"
              onClick={() =>
                onTogglePin && onTogglePin(question.id, !question.is_pinned)
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                question.is_pinned
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25"
                  : "bg-slate-700/50 text-slate-300 border border-white/10 hover:bg-slate-600/50"
              }`}
            >
              <AttachSquare size={14} />
              {question.is_pinned ? "Pinned" : "Standard"}
            </button>
          </div>

          {/* Views */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Total Views
            </span>
            <span className="inline-flex items-center gap-1.5 text-base font-bold text-slate-100">
              <Eye size={16} className="text-cyan-400" />
              {question.views_count || 0}
            </span>
          </div>
        </div>

        {/* Engagement & Author Details */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Telegram Handle */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Telegram Notification
              </span>
              <p className="text-xs text-slate-300">
                User requested Telegram DM notification upon answer
              </p>
            </div>

            {question.notify_handle ? (
              <a
                href={`https://t.me/${question.notify_handle.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Telegram size={16} className="shrink-0" />
                  <span>{question.notify_handle}</span>
                </div>
                <ExportSquare size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : (
              <span className="text-xs text-slate-500 font-medium italic">
                No notification handle provided
              </span>
            )}
          </div>

          {/* Timestamps */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Timestamps
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Clock size={15} className="text-cyan-400 shrink-0" />
              <span>Created:</span>
              <strong className="text-slate-100 font-semibold">
                {new Date(question.createdAt).toLocaleString()}
              </strong>
            </div>

            {question.answeredAt && (
              <div className="flex items-center gap-2 text-xs text-slate-300 pt-2 border-t border-white/10">
                <TickCircle size={15} className="text-green-400 shrink-0" />
                <span>Answered:</span>
                <strong className="text-slate-100 font-semibold">
                  {new Date(question.answeredAt).toLocaleString()}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* Reactions & Comments Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <Heart size={20} variant="Bold" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">Likes &amp; Reactions</p>
                <p className="text-lg font-bold text-slate-100">
                  {question.likes_count || totalReactions}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <MessageText size={20} variant="Bold" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-300">Comments</p>
                <p className="text-lg font-bold text-slate-100">{questionComments.length}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>,
    document.body
  );
}
