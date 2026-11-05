import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Copy, Check } from 'iconsax-react';
import { Facebook, Messenger, Instagram, Telegram, Twitter } from 'developer-icons';
import { sounds } from '../utils/soundEffects';

export default function ShareModal({ isOpen, onClose, url, questionText }) {
  const [copied, setCopied] = useState(false);
  const dragControls = useDragControls();
  const touchStartY = useRef(null);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      sounds.playPop(580);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTouchStart = (e) => {
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

  const shareLinks = [
    {
      name: 'Telegram',
      icon: <Telegram className="w-8 h-8 pointer-events-none" />,
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(questionText)}`,
    },
    {
      name: 'Facebook',
      icon: <Facebook className="w-8 h-8 pointer-events-none" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: 'Messenger',
      icon: <Messenger className="w-8 h-8 pointer-events-none" />,
      href: `fb-messenger://share/?link=${encodeURIComponent(url)}`,
    },
    {
      name: 'Instagram',
      icon: <Instagram className="w-8 h-8 pointer-events-none" />,
      href: `https://instagram.com/`, 
    },
    {
      name: 'Twitter',
      icon: <Twitter className="w-8 h-8 pointer-events-none" />,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(questionText)}`,
    },
  ];

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
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 70 || info.velocity.y > 300) {
                onClose();
              }
            }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="glass-shell relative w-full max-w-2xl rounded-t-3xl p-5 sm:p-6 shadow-2xl text-center z-10 touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle Indicator */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: "none" }}
              className="w-full flex flex-col items-center justify-center pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
              title="Drag down to close"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mb-3" />
            </div>
            
            <h2 
              onPointerDown={(e) => dragControls.start(e)}
              className="text-base font-bold mb-4 text-slate-800 dark:text-white select-none cursor-grab active:cursor-grabbing"
            >
              Share Question
            </h2>
            
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-4">
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-subpane flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 font-semibold transition-all transform active:scale-95 hover:bg-white/40 dark:hover:bg-white/5 shadow-sm"
                >
                  {link.icon}
                  <span className="text-xs text-slate-700 dark:text-slate-200">{link.name}</span>
                </a>
              ))}
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/50 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 py-0.5 rounded-full bg-[color:var(--bg-base)] border border-[color:var(--card-border)] text-slate-500 dark:text-slate-400 select-none">
                  Or copy link
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <div className="glass-subpane flex-1 truncate rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 text-left select-all">
                {url}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center w-11 h-11 shrink-0 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white transition-all active:scale-90 border border-cyan-400/20 shadow-sm cursor-pointer"
                title="Copy link"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
