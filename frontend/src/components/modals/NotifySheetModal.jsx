import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { CloseCircle, Check, Trash } from "iconsax-react";
import { Telegram } from "developer-icons";

export default function NotifySheetModal({
  isOpen,
  onClose,
  initialHandle = "",
  onSaveHandle,
  onShowToast,
}) {
  const [handleInput, setHandleInput] = useState("");
  const dragControls = useDragControls();
  const touchStartY = useRef(null);

  // Sync initial handle when modal opens (NO autofocus)
  useEffect(() => {
    if (isOpen) {
      const clean = initialHandle ? initialHandle.replace(/^@+/, "") : "";
      setHandleInput(clean);
    }
  }, [isOpen, initialHandle]);

  // Close on Escape key
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

  const handleTouchStart = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 70) {
      touchStartY.current = null;
      onClose();
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  if (typeof document === "undefined") return null;

  const handleKeyDown = (e) => {
    // 1. Block Space
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      onShowToast?.("Spaces are not allowed in Telegram username.", "error");
      return;
    }

    // 2. Block Non-English / Special characters (Allow control keys: Backspace, Delete, Arrows, Enter)
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !/^[a-zA-Z0-9_@]$/.test(e.key)
    ) {
      e.preventDefault();
      onShowToast?.(
        "Only English letters (a-z), numbers (0-9), and underscores (_) are allowed.",
        "error"
      );
    }
  };

  const handleInputChange = (e) => {
    const rawVal = e.target.value;

    // Check if user pasted spaces
    if (/\s/.test(rawVal)) {
      onShowToast?.("Spaces were removed from Telegram username.", "error");
    }

    // Check if user pasted non-English characters
    const nonEnglishRegex = /[^a-zA-Z0-9_@]/;
    if (nonEnglishRegex.test(rawVal)) {
      onShowToast?.(
        "Only English letters (a-z), numbers (0-9), and underscores (_) are allowed.",
        "error"
      );
    }

    // Sanitize: strip spaces and invalid characters
    const cleaned = rawVal
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9_@]/g, "")
      .replace(/^@+/, "");

    setHandleInput(cleaned);
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Blur active element to dismiss virtual keyboard cleanly
    if (typeof document !== "undefined" && document.activeElement?.blur) {
      document.activeElement.blur();
    }

    const clean = handleInput.trim().replace(/^@+/, "");
    if (!clean) {
      onSaveHandle("");
      onClose();
      return;
    }

    if (clean.length < 3) {
      onShowToast?.("Telegram username must be at least 3 characters.", "error");
      return;
    }

    onSaveHandle(`@${clean}`);
    onShowToast?.(`Telegram username saved: @${clean}`, "success");
    onClose();
  };

  const handleClear = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (typeof document !== "undefined" && document.activeElement?.blur) {
      document.activeElement.blur();
    }

    setHandleInput("");
    onSaveHandle("");
    onShowToast?.("Telegram notification removed.", "info");
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          {/* Backdrop - simple dark, no blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 dark:bg-black/60"
          />

          {/* Sheet Modal Card with Swipe / Drag Down to Close */}
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="glass-shell relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top drag handle indicator */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: "none" }}
              className="w-full flex items-center justify-center pt-1 pb-3 cursor-grab active:cursor-grabbing select-none"
              title="Drag down to close"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mb-2" />
            </div>

            {/* Header with Telegram Icon */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: "none" }}
              className="flex items-center gap-3 mb-5 cursor-grab active:cursor-grabbing select-none"
            >
              <Telegram size={38} className="shrink-0 pointer-events-none" />
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                  Telegram Notification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Get notified the moment Sila answers your question
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Telegram Username
                </label>
                <div className="glass-subpane relative flex items-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/30 transition-all overflow-hidden">
                  <span className="pl-4 pr-1 text-cyan-600 dark:text-cyan-400 font-bold text-sm select-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="yourusername"
                    maxLength={32}
                    className="w-full h-12 pr-4 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-medium"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                  />
                  {handleInput && (
                    <button
                      type="button"
                      onClick={() => setHandleInput("")}
                      className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                      title="Clear text"
                    >
                      <CloseCircle size={18} />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 px-1">
                  Only English letters (a-z), numbers (0-9), and underscores (_). No spaces.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {initialHandle && (
                  <button
                    type="button"
                    onPointerDown={handleClear}
                    onClick={handleClear}
                    className="h-12 px-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Remove notification"
                  >
                    <Trash size={16} />
                    <span>Remove</span>
                  </button>
                )}

                <button
                  type="submit"
                  onPointerDown={handleSave}
                  onClick={handleSave}
                  className="flex-1 h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  <Check size={18} />
                  <span>{handleInput ? "Save & Notify Me" : "Done"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
