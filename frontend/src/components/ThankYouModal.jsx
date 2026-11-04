import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TickCircle } from 'iconsax-react';

export default function ThankYouModal({ isOpen, onClose }) {
  const [animationState, setAnimationState] = useState('hidden-top'); // 'hidden-top', 'visible', 'hidden-bottom'
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let timer;
    if (isOpen) {
      setShouldRender(true);
      timer = setTimeout(() => {
        setAnimationState('visible');
      }, 30);
    } else {
      setAnimationState('hidden-bottom');
      timer = setTimeout(() => {
        setShouldRender(false);
        setAnimationState('hidden-top');
      }, 500);
    }
    return () => clearTimeout(timer);
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
      className={`fixed inset-0 z-[150] overflow-x-hidden flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-500 ${
        isVisible ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
      onClick={onClose}
    >
      <div
        className={`glass-shell relative w-full max-w-sm rounded-[2.5rem] p-7 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] text-center transition-transform duration-500 ease-in-out transform ${transformClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl text-emerald-500 dark:text-emerald-400 mb-3 flex justify-center">
          <TickCircle size={48} variant="Bold" className="animate-bounce" />
        </div>

        <h2 className="text-lg font-bold mb-2 text-slate-800 dark:text-white">
          Thank you for your question!
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Your question has been sent anonymously! 🚀<br />
          Sila will answer it here soon. 💙
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md cursor-pointer text-sm"
        >
          Awesome
        </button>
      </div>
    </div>,
    document.body
  );
}
