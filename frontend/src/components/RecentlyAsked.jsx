import React, { useRef, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Heart, Tag, Message, Eye, Send2, Lock, Check, ArrowDown2, AttachSquare } from "iconsax-react";
import { motion, AnimatePresence } from "framer-motion";
import ShareModal from "./ShareModal";
import CommentModal from "./CommentModal";
import CoverBanner from "./CoverBanner";
import Profile from "./Profile";
import QuestionForm from "./QuestionForm";
import FAQSection from "./FAQSection";
import ReactionButton, { getEmojiForType, triggerEmojiBurst, REACTION_TYPES } from "./ReactionButton";
import { sounds } from "../utils/soundEffects";

function QuestionSEO({ question, answer }) {
  const title = question ? `"${question}" - Ask Sila` : "Ask Sila Anything";
  const description = answer 
    ? `Sila's answer: ${answer.substring(0, 150)}...` 
    : question 
      ? `Check out this question: "${question.substring(0, 150)}..."`
      : "Ask Sila anything and get the real answer for himsefl!";
  
  const structuredData = question ? {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": question,
      "text": question,
      "answerCount": answer ? 1 : 0,
      "acceptedAnswer": answer ? {
        "@type": "Answer",
        "text": answer,
        "upvoteCount": 1,
        "url": window.location.href
      } : undefined
    }
  } : null;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="twitter:card" content="summary_large_image" />
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

function ExpandableText({ text, className = "", innerClassName = "" }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const safeText = text || "";
  const lines = safeText.split('\n');
  const hasManyLines = lines.length > 8;
  const isTooLong = safeText.length > 450 || hasManyLines;

  if (!isTooLong) {
    return (
      <div className={`${className} ${innerClassName} whitespace-pre-wrap break-words`}>
        {safeText}
      </div>
    );
  }

  let displayText = safeText;
  if (!isExpanded) {
    if (hasManyLines) {
      const first8Lines = lines.slice(0, 8);
      const joined = first8Lines.join('\n');
      if (joined.length > 450) {
        displayText = joined.slice(0, 450).trim();
      } else {
        displayText = joined.trim();
      }
    } else {
      displayText = safeText.slice(0, 450).trim();
    }
  }

  return (
    <motion.div
      layout
      className={`${className} ${innerClassName} whitespace-pre-wrap break-words`}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {isExpanded ? (
        <>
          {safeText}{' '}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold text-xs inline ml-1 transition-colors focus:outline-none"
          >
            (show less)
          </button>
        </>
      ) : (
        <>
          {displayText}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold text-xs inline ml-1 transition-colors focus:outline-none"
          >
            ...see more
          </button>
        </>
      )}
    </motion.div>
  );
}

export function QuestionCard({ q, designs, comments, onAddComment, likedQuestions, handleLike, likedComments, handleLikeComment, handleView, timeAgo, isSingleView = false, isLocked = false, typingState, likedAnswers, handleLikeAnswer }) {
  const cardRef = useRef(null);
  const hasViewed = useRef(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showAnswerPicker, setShowAnswerPicker] = useState(false);
  const timerRef = useRef(null);
  const answerTimerRef = useRef(null);

  const handleTouchStart = () => {
    if (isLocked) return;
    timerRef.current = setTimeout(() => {
      setShowPicker(true);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleAnswerTouchStart = () => {
    if (isLocked) return;
    answerTimerRef.current = setTimeout(() => {
      setShowAnswerPicker(true);
    }, 400);
  };

  const handleAnswerTouchEnd = () => {
    if (answerTimerRef.current) {
      clearTimeout(answerTimerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (answerTimerRef.current) clearTimeout(answerTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isLocked) return;
    const viewedQuestions = JSON.parse(localStorage.getItem('viewedQuestions') || '[]');
    if (viewedQuestions.includes(q.id)) {
      hasViewed.current = true;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasViewed.current) {
          hasViewed.current = true;
          handleView(q.id);
          const currentViewed = JSON.parse(localStorage.getItem('viewedQuestions') || '[]');
          if (!currentViewed.includes(q.id)) {
            localStorage.setItem('viewedQuestions', JSON.stringify([...currentViewed, q.id]));
          }
        }
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, [q.id, handleView, isLocked]);

  const designWithAnswer = designs.find((d) => 
    d.questionId && d.questionId.toString().toLowerCase() === q.id.toString().toLowerCase()
  );
  
  const charCodeSum = q.id.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const tagIndex = charCodeSum % 4;
  const tags = ["General", "Personal", "Ask Sila", "Curiosity"];
  
  const userReaction = likedQuestions && !Array.isArray(likedQuestions) ? likedQuestions[q.id] || null : (likedQuestions?.includes?.(q.id) ? "heart" : null);

  const activeReactions = useMemo(() => {
    const counts = q.reactions || { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 };
    return Object.entries(counts)
      .filter(([type, count]) => (count || 0) > 0)
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
  }, [q.reactions]);

  const userAnswerReaction = likedAnswers && !Array.isArray(likedAnswers) ? likedAnswers[q.id] || null : (likedAnswers?.includes?.(q.id) ? "heart" : null);

  const activeAnswerReactions = useMemo(() => {
    const counts = q.answer_reactions || { heart: 0, laugh: 0, think: 0, gasp: 0, fire: 0 };
    return Object.entries(counts)
      .filter(([type, count]) => (count || 0) > 0)
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
  }, [q.answer_reactions]);

  const handleShare = (e) => {
    if (isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const questionComments = useMemo(() => {
    return (comments || []).filter((c) => c.questionId === q.id);
  }, [comments, q.id]);

  return (
    <div
      ref={cardRef}
      key={q.id}
      className={`relative w-full h-auto flex flex-col gap-3.5 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.25rem] overflow-hidden bg-white/70 dark:bg-slate-800/35 hover:dark:bg-slate-800/45 backdrop-blur-2xl border border-white/80 dark:border-white/25 hover:border-cyan-500/30 dark:hover:border-white/12 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.12)] dark:hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.28)] transition-all duration-300 text-slate-900 dark:text-white ${isSingleView ? 'shadow-2xl' : ''}`}
    >
      {/* Specular top rim highlight for iOS Liquid Glass */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

      {isLocked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-3 animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <Lock size={32} className="text-cyan-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Question Locked</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ask Sila a question to reveal what others asked!</p>
            </div>
          </div>
        </div>
      )}

      <div className={isLocked ? "blur-md pointer-events-none select-none" : ""}>
        {isSingleView && <QuestionSEO question={q.question} answer={designWithAnswer?.answerText || designWithAnswer?.text} />}
        
        <div className="flex items-center justify-between mb-3">
          <Link 
            to={isLocked ? "#" : `/q/${q.number || q.id}`}
            className={`flex items-center gap-3 ${!isSingleView ? "hover:opacity-80 transition-opacity cursor-pointer" : "cursor-default"}`}
            title={!isSingleView ? "View detail page" : ""}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/15 dark:to-white/5 flex items-center justify-center shrink-0 overflow-hidden text-white shadow-md border border-white/80 dark:border-white/15">
              <span className="text-lg">👻</span>
            </div>
            <div>
              <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm hover:underline">Anonymous</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{timeAgo(q.createdAt)}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {!isSingleView && q.is_pinned && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-sm">
                <AttachSquare size={12} variant="Bold" />
                <span>Pinned</span>
              </span>
            )}
            <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/20 dark:border-cyan-400/25 text-cyan-700 dark:text-cyan-300 whitespace-nowrap font-bold shadow-sm backdrop-blur-md">
              <span>{tags[tagIndex]}</span>
              <Tag size={12} className="stroke-[2.5]" />
            </div>
          </div>
        </div>

        <div className="w-full block break-words mb-1">
          <ExpandableText
            text={q.question}
            innerClassName="text-slate-900 dark:text-zinc-50 text-sm sm:text-base font-semibold leading-relaxed tracking-tight mt-1"
          />
        </div>

        {designWithAnswer && (designWithAnswer.answerText || designWithAnswer.text) && (
          <div className="relative overflow-hidden w-full p-3.5 sm:p-5 rounded-2xl sm:rounded-[1.35rem] bg-gradient-to-br from-cyan-500/[0.08] via-cyan-500/[0.03] to-transparent dark:from-cyan-500/[0.09] dark:to-cyan-950/20 backdrop-blur-xl border border-cyan-500/20 dark:border-cyan-400/25 border-l-[3.5px] border-l-cyan-500 flex flex-col gap-2 mt-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/40 via-white/50 dark:via-white/15 to-transparent" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img 
                  src="/sila2.jpg" 
                  className="w-7 h-7 rounded-full object-cover border border-cyan-500/40 shadow-sm" 
                  alt="Sila" 
                />
                <div>
                  <p className="font-bold text-xs text-cyan-600 dark:text-cyan-400 leading-tight">
                    Sila
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                    {timeAgo(designWithAnswer.updatedAt || designWithAnswer.createdAt)}
                  </p>
                </div>
              </div>
              
              {/* Sila Answer Likes Reaction */}
              <ReactionButton
                targetId={q.id}
                userReaction={userAnswerReaction}
                reactions={q.answer_reactions}
                likesCount={q.answer_likes_count}
                onReact={handleLikeAnswer}
                isLocked={isLocked}
                size="sm"
                showCount={true}
                pickerPlacement="top"
                activeEmojis={activeAnswerReactions}
              />
            </div>
            <ExpandableText
              text={designWithAnswer.answerText || (designWithAnswer.text && designWithAnswer.text.includes('\nA: ') ? designWithAnswer.text.split('\nA: ')[1] : designWithAnswer.text)}
              className="pl-2 sm:pl-7"
              innerClassName="text-slate-800 dark:text-zinc-100 text-xs sm:text-sm mali-medium leading-relaxed"
            />
          </div>
        )}

        {/* Live Typing State */}
        {!designWithAnswer && typingState && typingState.questionId === q.id && typingState.isTyping && (
          <div className="relative overflow-hidden w-full p-3.5 sm:p-5 rounded-2xl sm:rounded-[1.35rem] bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent dark:from-amber-500/[0.09] dark:to-amber-950/20 backdrop-blur-xl border border-amber-500/20 dark:border-amber-400/25 border-l-[3.5px] border-l-amber-500 flex flex-col gap-2 mt-2 shadow-sm transition-all duration-300">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-400/40 via-white/50 dark:via-white/15 to-transparent" />
            <div className="flex items-center gap-2">
              <img 
                src="/sila2.jpg" 
                className="w-7 h-7 rounded-full object-cover border border-amber-500/40 animate-[bounce_1.5s_infinite]" 
                alt="Sila" 
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-xs text-amber-600 dark:text-amber-400 leading-tight">
                    Sila is answering
                  </p>
                  <div className="flex gap-0.5 items-center">
                    <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                  typing now
                </p>
              </div>
            </div>
            <div className="pl-2 sm:pl-7 text-slate-800 dark:text-zinc-100 text-xs sm:text-sm mali-medium whitespace-pre-wrap break-words min-h-[1.5rem] relative mt-1 leading-relaxed">
              {typingState.text || (
                <span className="italic text-slate-400 dark:text-slate-500">Sila is thinking...</span>
              )}
              {typingState.text && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-500 dark:bg-amber-400 animate-pulse align-middle">|</span>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 pt-3.5 border-t border-slate-200/60 dark:border-white/[0.08] flex items-center justify-around">
          <ReactionButton
            targetId={q.id}
            userReaction={userReaction}
            reactions={q.reactions}
            likesCount={q.likes_count}
            onReact={handleLike}
            isLocked={isLocked}
            size="md"
            showCount={true}
            pickerPlacement="top"
            activeEmojis={activeReactions}
          />
          
          <button 
            onClick={() => !isLocked && setIsCommentModalOpen(true)}
            className={`flex items-center gap-2 py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 hover:bg-slate-100/60 dark:hover:bg-white/5 group/comment cursor-pointer ${
              isCommentModalOpen
                ? "text-cyan-500" 
                : "text-slate-600 hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-400"
            }`}
            title="View comments"
          >
            <Message size={18} className={isCommentModalOpen ? "fill-cyan-500/20" : ""} />
            <span className={`text-sm md:text-base font-semibold ${isCommentModalOpen ? "text-cyan-500" : "text-slate-700 dark:text-slate-200"}`}>
              {questionComments.length || 0}
            </span>
          </button>

          <button 
            onClick={handleShare}
            className="flex items-center gap-2 py-1.5 px-3 rounded-xl text-slate-600 hover:text-cyan-500 dark:text-slate-300 dark:hover:text-cyan-400 hover:bg-slate-100/60 dark:hover:bg-white/5 transition-all active:scale-95 group/share cursor-pointer"
            title="Share question"
          >
            <Send2 size={18} />
          </button>

          <div className="flex items-center gap-1.5 py-1.5 px-3 text-slate-500 dark:text-slate-400">
            <Eye size={17} className="opacity-70 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-semibold">{q.views_count || 0}</span>
          </div>
        </div>
      </div>
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        url={`${window.location.origin}/q/${q.number || q.id}`} 
        questionText={q.question} 
      />
      <CommentModal 
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        comments={questionComments}
        onAddComment={onAddComment}
        likedComments={likedComments}
        handleLikeComment={handleLikeComment}
        qId={q.id}
        timeAgo={timeAgo}
      />
    </div>
  );
}

export default function RecentlyAsked({ 
  questions, designs, comments, onAddComment, likedQuestions, handleLike, likedComments, handleLikeComment, handleView, timeAgo, 
  handleSuccess, submitUserQuestion, filterMode, setFilterMode, isFilterOpen, setIsFilterOpen, listRef,
  hasAskedQuestion, typingState, likedAnswers, handleLikeAnswer 
}) {
  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      <QuestionSEO />
      <div className="glass-shell glass-shell--3d w-full rounded-[2rem] overflow-hidden">
        <CoverBanner />
        <div className="p-4 sm:p-8 pt-0 sm:pt-0">
          <Profile />
          <QuestionForm
            onSuccess={handleSuccess}
            onSubmitQuestion={submitUserQuestion}
          />
        </div>
      </div>

      {questions.length > 0 && (
        <div className="w-full md:max-w-2xl mx-auto flex flex-col gap-4 p-0 sm:p-1 overflow-visible">
          <div className="relative z-50 w-full flex items-center justify-between px-1 mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              Recently Asked
            </h2>
            
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="inline-flex items-center justify-between gap-2 bg-[color:var(--icon-chip)] text-[color:var(--app-text)] border border-[color:var(--card-border)] rounded-xl px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all duration-200 hover:bg-[color:var(--icon-chip-hover)]"
              >
                <span>
                  {filterMode === "all" && "All"}
                  {filterMode === "top" && "Top React"}
                  {filterMode === "top_views" && "Top Views"}
                  {filterMode === "oldest" && "Oldest"}
                </span>
                <ArrowDown2
                  className={`w-3 h-3 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`}
                  size={12}
                />
              </button>

              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div 
                    key="filter-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90]" 
                    onClick={() => setIsFilterOpen(false)}
                  />
                )}
                
                {isFilterOpen && (
                  <motion.div 
                    key="filter-dropdown"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="glass-shell absolute right-0 top-full mt-1.5 w-36 rounded-xl p-1 flex flex-col gap-0.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <button
                      onClick={() => {
                        setFilterMode("all");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all font-medium ${
                        filterMode === "all" 
                          ? "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400" 
                          : "text-[color:var(--app-text)] opacity-80 hover:opacity-100 hover:bg-[color:var(--icon-chip-hover)]"
                      }`}
                    >
                      <span>All</span>
                      {filterMode === "all" && <Check size={14} className="shrink-0" />}
                    </button>
                    <button
                      onClick={() => {
                        setFilterMode("top");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all font-medium ${
                        filterMode === "top" 
                          ? "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400" 
                          : "text-[color:var(--app-text)] opacity-80 hover:opacity-100 hover:bg-[color:var(--icon-chip-hover)]"
                      }`}
                    >
                      <span>Top React</span>
                      {filterMode === "top" && <Check size={14} className="shrink-0" />}
                    </button>
                    <button
                      onClick={() => {
                        setFilterMode("top_views");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all font-medium ${
                        filterMode === "top_views" 
                          ? "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400" 
                          : "text-[color:var(--app-text)] opacity-80 hover:opacity-100 hover:bg-[color:var(--icon-chip-hover)]"
                      }`}
                    >
                      <span>Top Views</span>
                      {filterMode === "top_views" && <Check size={14} className="shrink-0" />}
                    </button>
                    <button
                      onClick={() => {
                        setFilterMode("oldest");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-all font-medium ${
                        filterMode === "oldest" 
                          ? "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400" 
                          : "text-[color:var(--app-text)] opacity-80 hover:opacity-100 hover:bg-[color:var(--icon-chip-hover)]"
                      }`}
                    >
                      <span>Oldest</span>
                      {filterMode === "oldest" && <Check size={14} className="shrink-0" />}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative z-10 w-full flex flex-col gap-4 p-2 sm:p-4 md:p-6 overflow-visible">
            {[...questions]
              .sort((a, b) => {
                if (filterMode === "all" && a.is_pinned !== b.is_pinned) {
                  return a.is_pinned ? -1 : 1;
                }
                if (filterMode === "top") {
                  return (b.likes_count || 0) - (a.likes_count || 0);
                }
                if (filterMode === "top_views") {
                  return (b.views_count || 0) - (a.views_count || 0);
                }
                if (filterMode === "oldest") {
                  return new Date(a.createdAt) - new Date(b.createdAt);
                }
                return new Date(b.createdAt) - new Date(a.createdAt);
              })
              .map((q) => (
                <motion.div
                  key={q.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <QuestionCard
                    q={q}
                    designs={designs}
                    comments={comments}
                    onAddComment={onAddComment}
                    likedQuestions={likedQuestions}
                    handleLike={handleLike}
                    likedComments={likedComments}
                    handleLikeComment={handleLikeComment}
                    handleView={handleView}
                    timeAgo={timeAgo}
                    isLocked={!hasAskedQuestion}
                    typingState={typingState}
                    likedAnswers={likedAnswers}
                    handleLikeAnswer={handleLikeAnswer}
                  />
                </motion.div>
              ))}
          </div>
        </div>
      )}
      <FAQSection />
    </div>
  );
}