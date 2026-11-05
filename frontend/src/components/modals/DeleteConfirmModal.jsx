import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Danger } from 'iconsax-react';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, questionText }) {
  const [animationState, setAnimationState] = useState('hidden-top'); // 'hidden-top', 'visible', 'hidden-bottom'
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationState('visible');
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setAnimationState('hidden-bottom');
      const timer = setTimeout(() => {
        setShouldRender(false);
        setAnimationState('hidden-top');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  if (!shouldRender) return null;

  const isVisible = animationState === 'visible';

  let transformClass = 'translate-y-0 scale-100';
  if (animationState === 'hidden-top') {
    transformClass = '-translate-y-[100vh] scale-95';
  } else if (animationState === 'hidden-bottom') {
    transformClass = 'translate-y-[100vh] scale-95';
  }

  return createPortal(
    <div 
      className={`fixed inset-0 z-[200] overflow-x-hidden flex items-center justify-center p-4 bg-black/50 transition-all duration-500 ${
        isVisible ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
      onClick={onClose}
    >
      <div 
        className={`glass-shell relative w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] text-center transition-transform duration-500 ease-in-out transform ${transformClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
          <Danger size={32} className="text-rose-500" />
        </div>
        
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Delete</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 px-2 text-sm leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">"{questionText}"</span>? This action will hide the question from all feeds.
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
          >
            No
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-all shadow-lg shadow-rose-500/20 transform active:scale-95 cursor-pointer"
          >
            Yes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
