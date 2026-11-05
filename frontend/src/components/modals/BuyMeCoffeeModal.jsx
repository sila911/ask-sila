import React, { useEffect, useState } from 'react';
import qrCode from '../../assets/qr-code.jpg';

export default function BuyMeCoffeeModal({ isOpen, onClose }) {
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

  return (
    <div 
      className={`fixed inset-0 z-[150] overflow-x-hidden flex items-center justify-center p-4 bg-black/50 transition-all duration-500 ${
        isVisible ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
      onClick={onClose}
    >
      <div 
        className={`glass-shell relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] text-center transition-transform duration-500 ease-in-out transform ${transformClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="text-2xl font-bold mb-6 text-emerald-700 dark:text-emerald-400">Buy me a coffee</h1>
        
        <div className="mb-8 flex justify-center">
          <div className="bg-white dark:bg-white border border-slate-200/60 p-0 rounded-2xl overflow-hidden shadow-inner relative">
            <img 
              src={qrCode} 
              alt="QR Code" 
              className="w-42 h-48 object-cover shadow-sm"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/200?text=QR+Code';
                e.target.onerror = null;
              }}
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <a
            href="https://acledabank.com.kh/acleda?payment_data=qWY5B2SAUfIhLblxzOtfu45tm4QZydtR8ste17vNItjT3Chxy1uq2e1VifDvybGWoX8Md+nprYtJNaV2/goNF2hYO52Bv9AprFiSGN6OqxO2yg4RP2jReNqNssWZ+QE7O65BbuNH2o6b8t3mBcqXBjIaqihYWpVThtY8hw/mDS1tNqRWNqDUhPee+iISOuavOO6/wAZ16a/Gdnh+ovIdCw==&key=khqr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-50/70 dark:bg-[#005aab]/15 hover:bg-blue-100/70 dark:hover:bg-[#005aab]/25 text-[#004b93] dark:text-blue-300 py-3 font-bold transition-all transform active:scale-95 border border-[#005aab]/30 dark:border-[#005aab]/20 shadow-sm"
          >
            <img src="https://www.acledabank.com.kh/kh/assets/download_material/download-logo-icon.png" alt="" className="w-6 h-6 object-contain" />
            <span>Acleda</span>
          </a>
          <a
            href="https://pay.ababank.com/oRF8/37utlwxa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber-50/70 dark:bg-amber-500/15 hover:bg-amber-100/70 dark:hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 py-3 font-bold transition-all transform active:scale-95 border border-amber-500/30 dark:border-amber-500/20 shadow-sm"
          >
            <img src="https://informal.digitaleconomy.gov.kh/images/ministry-icon/aba_round.png" alt="" className="w-6 h-6 object-contain" />
            <span>ABA</span>
          </a>
        </div>
        
        <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
          Your support means the world to me! 💫
        </p>
      </div>
    </div>
  );
}
