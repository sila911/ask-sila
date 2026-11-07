import { useState, useRef, useEffect, useCallback } from 'react'
import { Shuffle, Send2, Refresh, CloseCircle, Warning2 } from 'iconsax-react'
import { Telegram } from 'developer-icons'
import { motion, AnimatePresence } from 'framer-motion'
import { checkRateLimit, recordSubmission, validateQuestionText } from '../lib/spamFilter'
import { apiRequest } from '../lib/apiClient'
import Toast from './ui/Toast'
import NotifySheetModal from './modals/NotifySheetModal'
import { sounds } from '../utils/soundEffects'

const QUESTIONS = [
  // --- General & Core Prompts ---
  "What motivates you every day?",
  "What is the first thing you notice about someone when you meet them? 👁️",
  "What is a 'red flag' in a partner that you secretly like? 🚩",
  "What is the most important rule for resolving arguments in a relationship?",
  "What's your favorite way to spend a weekend?",
  "What advice would you give your younger self?",
  "What is something people don't know about you?",

  // --- General Relationship & Dating Prompts ---
  "What’s your absolute biggest dealbreaker in a relationship?",
  "What is your idea of a perfect, low-key date night? 🕯️",
  "Do you believe in love at first sight, or does it take time to build? 💘",
  "What is the best relationship advice you've ever received?",
  "How do you usually express affection in a relationship (love languages)? 💬",
  "Would you rather date someone who is exactly like you, or your complete opposite?",
  "What is something you think is underrated in a healthy relationship?",
  "What's a hobby or interest you would love to share with a partner? 🎨",
  "In your opinion, what is the key to maintaining a strong long-term relationship?",
  "Are you the type to fall fast and hard, or do you take things slow and steady? 🐢",
  "What is a green flag in a person that immediately makes them more attractive? 💚"
];

export default function QuestionForm({ onSuccess, onSubmitQuestion }) {
  const [question, setQuestion] = useState('')
  const [notifyHandle, setNotifyHandle] = useState('')
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [placeholder, setPlaceholder] = useState('')
  const [isShuffling, setIsShuffling] = useState(false)
  const typingRef = useRef(null)

  const handleCloseToast = useCallback(() => {
    setToast(null)
  }, [])

  // Clear typing animation timer on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearInterval(typingRef.current)
      }
    }
  }, [])

  // Auto-cycling placeholder typing animation
  useEffect(() => {
    const texts = [
      "Ask Sila anything...",
      "Something in your mind to ask Sila?...",
    ];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;

    const type = () => {
      const currentText = texts[textIndex];
      
      if (isDeleting) {
        setPlaceholder(currentText.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setPlaceholder(currentText.substring(0, charIndex + 1));
        charIndex++;
      }

      let speed = isDeleting ? 30 : 60;

      if (!isDeleting && charIndex === currentText.length) {
        speed = 2200; // Pause at end of text
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        speed = 400; // Pause before starting next text
      }

      timeoutId = setTimeout(type, speed);
    };

    type();
    return () => clearTimeout(timeoutId);
  }, []);

  const handleShuffle = () => {
    sounds.playClick();
    if (typingRef.current) {
      clearInterval(typingRef.current)
    }
    setIsShuffling(true)
    setFormError('')

    let randomQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]
    if (randomQuestion === question && QUESTIONS.length > 1) {
      randomQuestion = QUESTIONS.find(q => q !== question) || randomQuestion
    }

    setQuestion('')
    let currentText = ''
    let charIndex = 0

    typingRef.current = setInterval(() => {
      if (charIndex < randomQuestion.length) {
        currentText += randomQuestion[charIndex]
        setQuestion(currentText)
        charIndex++
      } else {
        clearInterval(typingRef.current)
        typingRef.current = null
        setIsShuffling(false)
      }
    }, 18)
  }

  const handleTextChange = (e) => {
    if (typingRef.current) {
      clearInterval(typingRef.current)
      typingRef.current = null
      setIsShuffling(false)
    }
    if (formError) setFormError('')
    setQuestion(e.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const nextQuestion = question.trim()
    if (!nextQuestion) return

    // 1. Rate Limiting Check
    const rateCheck = checkRateLimit()
    if (!rateCheck.allowed) {
      const msg = rateCheck.message || "You've asked 3 questions recently. Please slow down and try again in ~10 min."
      setFormError(msg)
      setToast({
        type: 'warning',
        message: msg,
      })
      return
    }

    // 2. Anti-Spam & Toxicity Validation
    const textCheck = validateQuestionText(nextQuestion)
    if (!textCheck.isValid) {
      const errorMsg = textCheck.error || 'Please enter a valid question.'
      setFormError(errorMsg)
      setToast({
        type: 'error',
        message: errorMsg,
      })
      return
    }

    const rawHandle = notifyHandle.replace(/\s+/g, '').replace(/^@+/, '').trim()
    const cleanNotifyHandle = rawHandle ? `@${rawHandle}` : null

    if (onSubmitQuestion) {
      setIsLoading(true)
      try {
        await onSubmitQuestion(nextQuestion, cleanNotifyHandle)
        recordSubmission()
        sounds.playSuccess()
        setQuestion('')
        setNotifyHandle('')
        setShowNotifyModal(false)
        setToast(null)
        onSuccess()
      } catch (error) {
        console.error(error)
        const errMsg = 'Cannot save question right now. Please try again.'
        setFormError(errMsg)
        setToast({
          type: 'error',
          title: 'Error',
          detail: errMsg,
        })
      } finally {
        setIsLoading(false)
      }
      return
    }

    setIsLoading(true)

    try {
      await apiRequest('/questions', {
        method: 'POST',
        body: { question: nextQuestion, notifyHandle: cleanNotifyHandle }
      })

      recordSubmission()
      setQuestion('')
      setNotifyHandle('')
      setShowNotifyInput(false)
      setToast(null)
      onSuccess()
    } catch (error) {
      console.error(error)
      const errDetail = error.message || 'Cannot reach server. Please check your connection and try again.'
      setFormError(errDetail)
      setToast({
        type: 'error',
        title: 'Connection Error',
        detail: errDetail,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Toast toast={toast} onClose={handleCloseToast} duration={6000} />
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col">
        {/* Question Text Area */}
        <div className="relative group mb-2">
        <textarea
          id="question"
          name="question"
          value={question}
          onChange={handleTextChange}
          rows="5"
          placeholder={placeholder}
          className="w-full rounded-3xl p-4 px-14 bg-white/70 dark:bg-slate-800/35 hover:dark:bg-slate-800/45 focus:dark:bg-slate-800/50 backdrop-blur-2xl border border-white/80 dark:border-white/25 hover:dark:border-white/15 focus:outline-none resize-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400/60 focus:ring-2 focus:ring-cyan-300/40 dark:focus:ring-cyan-500/30 focus:border-cyan-400 dark:focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cause-medium"
        />

        {/* Shuffle Random Prompt Button */}
        <button
          type="button"
          onClick={handleShuffle}
          className="absolute bottom-3 left-3 w-10 h-10 flex items-center justify-center rounded-full
             bg-white/85 dark:bg-white/10 text-slate-700 dark:text-slate-100 border border-slate-200/80 dark:border-white/15
             hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm cursor-pointer backdrop-blur-md"
          title="Random Question Inspiration"
        >
          <motion.div
            animate={isShuffling ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <Shuffle size={16} />
          </motion.div>
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="absolute bottom-3 right-3 w-10 h-10 flex items-center justify-center rounded-full
             bg-cyan-500 hover:bg-cyan-400 text-white
             hover:scale-110 active:scale-90 transition-all duration-200 shadow-lg shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
        >
          {isLoading ? (
            <Refresh size={16} className="animate-spin" />
          ) : (
            <Send2 size={15} className="translate-x-[-1px] translate-y-[1px]" />
          )}
        </button>
      </div>

      {/* Centered "Notify me" Button Container (Zero margin-top) */}
      <div className="w-full flex items-center justify-center m-0 p-0">
        {!notifyHandle ? (
          <button
            type="button"
            onClick={() => setShowNotifyModal(true)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 rounded-full px-3.5 py-1.5 transition-all duration-200 shadow-sm cursor-pointer font-medium active:scale-95"
          >
            <Telegram size={14} className="shrink-0" />
            <span>Notify me</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded-full pl-3 pr-1.5 py-1 text-xs shadow-sm">
            <Telegram size={13} className="shrink-0" />
            <button
              type="button"
              onClick={() => setShowNotifyModal(true)}
              className="hover:underline cursor-pointer font-semibold"
            >
              {notifyHandle}
            </button>
            <button
              type="button"
              onClick={() => setNotifyHandle("")}
              className="text-slate-400 hover:text-rose-500 p-0.5 rounded-full transition-colors"
              title="Remove notification"
            >
              <CloseCircle size={14} />
            </button>
          </div>
        )}
      </div>

      <NotifySheetModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        initialHandle={notifyHandle}
        onSaveHandle={(handle) => setNotifyHandle(handle)}
        onShowToast={(msg, type) => setToast({ message: msg, type: type || 'error' })}
      />
    </form>
    </>
  )
}

