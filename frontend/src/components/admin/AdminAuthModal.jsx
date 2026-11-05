import { useEffect, useState, useRef } from "react";
import { ArrowLeft2 } from "iconsax-react";
import {
  requestPasswordReset,
  submitPasswordReset,
  requestTelegramOtp,
  verifyTelegramOtp,
} from "../../lib/adminAccess";
import { sounds } from "../../utils/soundEffects";
import AdminLoginView from "./auth/AdminLoginView";
import AdminOtpView from "./auth/AdminOtpView";
import AdminForgotResetView from "./auth/AdminForgotResetView";

export default function AdminAuthModal({ isOpen, onClose, onSubmit }) {
  const [view, setView] = useState("login"); // 'login', 'otp', 'forgot', 'reset'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lastFailedPassword, setLastFailedPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpToken, setOtpToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [cooldown, setCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otpInputRefs = useRef([]);

  const [animationState, setAnimationState] = useState("hidden-top");
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView("login");
      setPassword("");
      setLastFailedPassword("");
      setNewPassword("");
      setCode("");
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setMessage("");
      setShouldRender(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationState("visible");
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setAnimationState("hidden-bottom");
      const timer = setTimeout(() => {
        setShouldRender(false);
        setAnimationState("hidden-top");
      }, 500);
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

  // OTP Countdown & Cooldown
  useEffect(() => {
    let timer;
    if (view === "otp" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setError("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, timeLeft]);

  useEffect(() => {
    let cdTimer;
    if (view === "otp" && cooldown > 0) {
      setCanResend(false);
      cdTimer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(cdTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (cooldown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(cdTimer);
  }, [view, cooldown]);

  useEffect(() => {
    if (view === "otp") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [view]);

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    if (!password) return;
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (lastFailedPassword && password === lastFailedPassword) {
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const res = await onSubmit(password);
      if (res && res.requires2FA) {
        setOtpToken(res.token);
        setTimeLeft(60);
        setCooldown(30);
        setView("otp");
        setOtp(["", "", "", "", "", ""]);
        setMessage("A 6-digit verification code has been dispatched.");
        sounds.playClick();
      } else {
        setLastFailedPassword("");
      }
    } catch (err) {
      setError(err.message || "Invalid password");
      setLastFailedPassword(password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (timeLeft <= 0) return;
    const cleanVal = value.replace(/[^0-9]/g, "");
    if (!cleanVal && value !== "") return;

    sounds.playClick();
    const newOtp = [...otp];
    newOtp[index] = cleanVal ? cleanVal.slice(-1) : "";
    setOtp(newOtp);
    if (error) setError("");

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (cleanVal && newOtp.every((d) => d !== "")) {
      handleOtpVerify(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (timeLeft <= 0) return;
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    if (timeLeft <= 0) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/[^0-9]/g, "");
    if (pasted.length >= 6) {
      const digits = pasted.slice(0, 6).split("");
      setOtp(digits);
      otpInputRefs.current[5]?.focus();
      sounds.playClick();
      handleOtpVerify(digits.join(""));
    }
  };

  const handleOtpVerify = async (fullCode) => {
    if (!fullCode || fullCode.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    if (timeLeft <= 0) {
      setError("Verification code has expired.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const res = await verifyTelegramOtp(fullCode, otpToken);
      if (res && res.success) {
        sounds.playSuccess();
        onClose();
      } else {
        setError(res.message || "Invalid verification code.");
      }
    } catch (err) {
      setError(err.message || "Verification failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if ((timeLeft > 0 && !canResend) || isResending) return;
    setIsResending(true);
    setError("");
    setMessage("");
    try {
      const res = await requestTelegramOtp();
      if (res && res.success) {
        setOtpToken(res.token);
        setTimeLeft(60);
        setCooldown(30);
        setOtp(["", "", "", "", "", ""]);
        setMessage("A fresh 6-digit code has been dispatched!");
        sounds.playClick();
        otpInputRefs.current[0]?.focus();
      } else {
        setError(res.message || "Failed to resend code.");
      }
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  const handleForgot = async (e) => {
    e?.preventDefault?.();
    if (!email) {
      setError("Please enter your admin Gmail address.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await requestPasswordReset(email);
      setMessage(res.message || "6-digit reset code sent to your Gmail!");
      setView("reset");
    } catch (err) {
      setError(err.message || "Failed to send reset code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e?.preventDefault?.();
    if (!code || code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await submitPasswordReset(code, newPassword, email);
      setMessage(res.message || "Password reset successful! Logging in...");
      sounds.playSuccess();
      setTimeout(() => {
        setView("login");
        setMessage("");
        setCode("");
        setNewPassword("");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!shouldRender) return null;

  const isVisible = animationState === "visible";

  let transformClass = "translate-y-0 scale-100";
  if (animationState === "hidden-top") {
    transformClass = "-translate-y-[100vh] scale-95";
  } else if (animationState === "hidden-bottom") {
    transformClass = "translate-y-[100vh] scale-95";
  }

  return (
    <div
      className={`fixed inset-0 z-50 overflow-x-hidden flex items-center justify-center p-4 bg-black/50 transition-all duration-500 ${
        isVisible ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
      onClick={onClose}
    >
      <div
        className={`glass-shell w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 relative transition-transform duration-500 ease-in-out transform ${transformClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Left Back Icon (<) */}
        <button
          type="button"
          onClick={() => {
            if (view === "reset") {
              setView("forgot");
              setError("");
              setMessage("");
              sounds.playClick();
            } else if (view === "otp" || view === "forgot") {
              setView("login");
              setError("");
              setMessage("");
              sounds.playClick();
            } else {
              onClose();
            }
          }}
          className="absolute left-5 top-5 w-9 h-9 rounded-full theme-toggle-btn flex items-center justify-center cursor-pointer text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-all active:scale-90 shadow-sm z-10"
          aria-label="Back"
        >
          <ArrowLeft2 size={16} />
        </button>

        {view === "login" && (
          <AdminLoginView
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            lastFailedPassword={lastFailedPassword}
            error={error}
            isSubmitting={isSubmitting}
            handleLogin={handleLogin}
            onForgotPassword={() => {
              setView("forgot");
              setError("");
              setMessage("");
            }}
          />
        )}

        {view === "otp" && (
          <AdminOtpView
            otp={otp}
            otpInputRefs={otpInputRefs}
            timeLeft={timeLeft}
            message={message}
            error={error}
            isSubmitting={isSubmitting}
            isResending={isResending}
            handleOtpChange={handleOtpChange}
            handleOtpKeyDown={handleOtpKeyDown}
            handleOtpPaste={handleOtpPaste}
            handleOtpVerify={handleOtpVerify}
            handleResend={handleResend}
            formatTimer={formatTimer}
          />
        )}

        {(view === "forgot" || view === "reset") && (
          <AdminForgotResetView
            view={view}
            setView={setView}
            email={email}
            setEmail={setEmail}
            code={code}
            setCode={setCode}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            error={error}
            message={message}
            isSubmitting={isSubmitting}
            handleForgot={handleForgot}
            handleReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
