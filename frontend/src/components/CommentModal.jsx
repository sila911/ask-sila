import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Send2, Refresh } from "iconsax-react";
import ReactionButton from "./ReactionButton";
import { sounds } from "../utils/soundEffects";

export default function CommentModal({
  isOpen,
  onClose,
  comments = [],
  onAddComment,
  likedComments = {},
  handleLikeComment,
  qId,
  timeAgo
}) {
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const dragControls = useDragControls();
  const commentsContainerRef = useRef(null);
  const touchStartY = useRef(null);
  const lastTapRef = useRef(0);

  // Close on Escape key and prevent body scroll when open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleDoubleTap = () => {
    sounds.playClick();
    onClose();
  };

  const handleTouchEndHeader = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    await onAddComment(qId, commentText.trim());
    sounds.playSuccess();
    setCommentText("");
    setIsSubmittingComment(false);
  };

  // Touch gesture handling inside comments list:
  // When scrolled to the top (scrollTop <= 2), pulling down > 60px automatically closes the sheet!
  const handleScrollTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleScrollTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    const container = commentsContainerRef.current;

    if (container && container.scrollTop <= 2 && deltaY > 60) {
      touchStartY.current = null;
      onClose();
    }
  };

  const handleScrollTouchEnd = () => {
    touchStartY.current = null;
  };

  const sortedComments = [...(comments || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden">
          {/* Backdrop - simple dark, no blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Sheet Card with Swipe / Drag Down to Close */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 70 || info.velocity.y > 250) {
                onClose();
              }
            }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="glass-shell relative w-full max-w-2xl h-[55vh] flex flex-col rounded-t-3xl shadow-2xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle & Header */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              onDoubleClick={handleDoubleTap}
              onTouchEnd={handleTouchEndHeader}
              style={{ touchAction: "none" }}
              className="w-full flex flex-col items-center justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
              title="Double-click or drag down to close"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mb-3 pointer-events-none" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white pointer-events-none">
                {sortedComments.length} {sortedComments.length === 1 ? 'comment' : 'comments'}
              </h2>
            </div>

            {/* Comments List (with swipe-down detection when at top) */}
            <div
              ref={commentsContainerRef}
              onTouchStart={handleScrollTouchStart}
              onTouchMove={handleScrollTouchMove}
              onTouchEnd={handleScrollTouchEnd}
              className="flex-1 overflow-y-auto px-4 pb-4 overscroll-contain"
            >
              <div className="flex flex-col gap-4 mt-2 !overflow-visible">
                {sortedComments.length > 0 ? (
                  sortedComments.map((c) => {
                    const userReaction =
                      likedComments && !Array.isArray(likedComments)
                        ? likedComments[c.id] || null
                        : likedComments?.includes?.(c.id)
                        ? "heart"
                        : null;

                    const activeReactions = (() => {
                      const counts = c.reactions || { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 };
                      return Object.entries(counts)
                        .filter(([, count]) => (count || 0) > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type]) => {
                          switch (type) {
                            case "heart": return "❤️";
                            case "laugh": return "😂";
                            case "think": return "🤔";
                            case "gasp": return "😮";
                            case "fire": return "🔥";
                            default: return "❤️";
                          }
                        })
                        .slice(0, 3);
                    })();

                    return (
                      <div
                        key={c.id}
                        className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-slate-500 dark:text-slate-400 text-sm select-none">
                          👻
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                                Anonymous
                              </p>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {timeAgo(c.createdAt)}
                              </span>
                            </div>

                            <ReactionButton
                              targetId={c.id}
                              userReaction={userReaction}
                              reactions={c.reactions}
                              likesCount={c.likes_count}
                              onReact={handleLikeComment}
                              size="sm"
                              showCount={true}
                              pickerPlacement="right"
                              activeEmojis={activeReactions}
                            />
                          </div>
                          <p className="text-slate-800 dark:text-zinc-200 text-sm mt-0.5 break-words whitespace-pre-wrap">
                            {c.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-slate-500 select-none">
                    <p className="text-sm">No comments yet.</p>
                    <p className="text-xs mt-1">Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comment Input Footer */}
            <div className="shrink-0 p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-transparent">
              <form onSubmit={submitComment} className="flex items-center gap-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add comment..."
                  disabled={isSubmittingComment}
                  rows="1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitComment(e);
                    }
                  }}
                  className="flex-1 min-h-[40px] max-h-[120px] rounded-2xl px-4 py-2.5 text-sm bg-[color:var(--input-bg)] border border-[color:var(--input-border)] focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-slate-900 dark:text-white placeholder:text-slate-500 transition-all resize-none overflow-y-auto"
                />
                <button 
                  type="submit" 
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-cyan-500 text-white hover:scale-110 active:scale-90 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 shrink-0 cursor-pointer"
                  title="Send comment"
                >
                  {isSubmittingComment ? (
                    <Refresh size={16} className="animate-spin" />
                  ) : (
                    <Send2 size={15} className="translate-x-[-1px] translate-y-[1px]" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
