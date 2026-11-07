import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeSlash, ArrowLeft2 } from "iconsax-react";
import { sounds } from "../../../utils/soundEffects";
import {
  requestPasswordReset,
  submitPasswordReset,
  verifyResetOtp,
} from "../../../lib/adminAccess";

export default function AdminLockScreen({
  handleAdminAuth,
  handleVerifyOtp,
  handleResendOtp,
  showAdminToast,
  setIsAdminUnlocked,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = "/fuckoff";
  const MASKED_ADMIN_EMAIL = "s*********v@gmail.com";

  // Determine initial step from current URL pathname
  const getStepFromPath = (path) => {
    if (path.endsWith("/2fa") || path.endsWith("/otp")) return "otp";
    if (path.endsWith("/forgot")) return "forgot";
    if (path.endsWith("/new-password") || path.endsWith("/create-password")) return "new-password";
    if (path.endsWith("/reset")) return "reset";
    return "password";
  };

  // ─── Step Management: 'password' | 'otp' | 'forgot' | 'reset' | 'new-password'
  const [step, setStep] = useState(() => getStepFromPath(location.pathname));

  useEffect(() => {
    const matchedStep = getStepFromPath(location.pathname);
    if (matchedStep !== step) {
      setStep(matchedStep);
    }
  }, [location.pathname]);

  const changeStep = (nextStep) => {
    setStep(nextStep);
    if (nextStep === "otp") {
      navigate(`${basePath}/2fa`);
    } else if (nextStep === "forgot") {
      navigate(`${basePath}/forgot`);
    } else if (nextStep === "reset") {
      navigate(`${basePath}/reset`);
    } else if (nextStep === "new-password") {
      navigate(`${basePath}/new-password`);
    } else {
      navigate(basePath);
    }
  };

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lastFailedPassword, setLastFailedPassword] = useState("");

  // ─── Forgot / Reset State ─────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [resetOtp, setResetOtp] = useState(["", "", "", "", "", ""]);
  const [verifiedResetCode, setVerifiedResetCode] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("sila_admin_reset_code") || "";
    }
    return "";
  });
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("sila_admin_reset_token") || "";
    }
    return "";
  });

  const resetOtpInputRefs = useRef([]);
  const [resetTimeLeft, setResetTimeLeft] = useState(60);
  const [resetCooldown, setResetCooldown] = useState(30);
  const [resetCanResend, setResetCanResend] = useState(false);

  // ─── 2FA Login OTP State ──────────────────────────────────────────────────
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [token, setToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(60); // 60s in seconds
  const [cooldown, setCooldown] = useState(30); // 30s resend cooldown
  const [canResend, setCanResend] = useState(false);

  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const otpInputRefs = useRef([]);

  // ─── Reset OTP Timer & Cooldown Handlers ──────────────────────────────────
  useEffect(() => {
    let timer;
    if (step === "reset" && resetTimeLeft > 0) {
      timer = setInterval(() => {
        setResetTimeLeft((prev) => {
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
  }, [step, resetTimeLeft]);

  useEffect(() => {
    let cdTimer;
    if (step === "reset" && resetCooldown > 0) {
      setResetCanResend(false);
      cdTimer = setInterval(() => {
        setResetCooldown((prev) => {
          if (prev <= 1) {
            setResetCanResend(true);
            clearInterval(cdTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (resetCooldown === 0) {
      setResetCanResend(true);
    }
    return () => clearInterval(cdTimer);
  }, [step, resetCooldown]);

  useEffect(() => {
    if (step === "reset") {
      setTimeout(() => {
        resetOtpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // ─── 2FA OTP Timer & Cooldown Handlers ────────────────────────────────────
  useEffect(() => {
    let timer;
    if (step === "otp" && timeLeft > 0) {
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
  }, [step, timeLeft]);

  useEffect(() => {
    let cdTimer;
    if (step === "otp" && cooldown > 0) {
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
  }, [step, cooldown]);

  // Focus first OTP input when transitioning to OTP screen
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // ─── Step 1: Submit Password ──────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e?.preventDefault?.();
    if (!password) {
      const msg = "Please enter your admin password.";
      setError(msg);
      showAdminToast?.("Validation Error", msg, "error");
      return;
    }
    if (password.length < 4) {
      const msg = "Password must be at least 4 characters.";
      setError(msg);
      showAdminToast?.("Validation Error", msg, "error");
      return;
    }
    if (lastFailedPassword && password === lastFailedPassword) {
      return;
    }
    setIsLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await handleAdminAuth(password);
      if (!res.ok) {
        const msg = res.message || "Invalid admin password.";
        setError(msg);
        setLastFailedPassword(password);
        showAdminToast?.("Authentication Failed", msg, "error");
        setIsLoading(false);
        return;
      }

      setLastFailedPassword("");
      if (res.requires2FA) {
        setToken(res.token);
        setTimeLeft(60);
        setCooldown(30);
        changeStep("otp");
        setOtp(["", "", "", "", "", ""]);
        setInfoMessage("A 6-digit verification code has been dispatched.");
        showAdminToast?.("Code Dispatched", "A 6-digit verification code has been dispatched.", "info");
        sounds.playClick();
      }
    } catch (err) {
      const msg = err.message || "Authentication error occurred.";
      setError(msg);
      setLastFailedPassword(password);
      showAdminToast?.("Authentication Error", msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2: OTP Pin Handling ─────────────────────────────────────────────
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
      const fullCode = newOtp.join("");
      triggerVerify(fullCode);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (timeLeft <= 0) return;
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
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
      triggerVerify(digits.join(""));
    }
  };

  const triggerVerify = async (fullCode) => {
    if (!fullCode || fullCode.length !== 6) {
      const msg = "Please enter the complete 6-digit PIN.";
      setError(msg);
      showAdminToast?.("PIN Incomplete", msg, "error");
      return;
    }
    if (timeLeft <= 0) {
      const msg = "Verification code has expired. Please request a new code.";
      setError(msg);
      showAdminToast?.("Code Expired", msg, "error");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await handleVerifyOtp(fullCode, token);
      if (!res.ok) {
        const msg = res.message || "Invalid or expired verification code.";
        setError(msg);
        showAdminToast?.("Verification Failed", msg, "error");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
      } else {
        sounds.playSuccess();
      }
    } catch (err) {
      const msg = err.message || "Verification failed. Please try again.";
      setError(msg);
      showAdminToast?.("Verification Error", msg, "error");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = (e) => {
    e?.preventDefault?.();
    triggerVerify(otp.join(""));
  };

  const handleResend = async () => {
    if ((timeLeft > 0 && !canResend) || isResending) return;
    setIsResending(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await handleResendOtp();
      if (res.ok) {
        setToken(res.token);
        setTimeLeft(60);
        setCooldown(30);
        setOtp(["", "", "", "", "", ""]);
        setInfoMessage("A fresh 6-digit code has been dispatched!");
        showAdminToast?.("Code Dispatched", "A fresh 6-digit code has been dispatched!", "info");
        sounds.playClick();
        otpInputRefs.current[0]?.focus();
      } else {
        const msg = res.message || "Failed to resend code. Please try again.";
        setError(msg);
        showAdminToast?.("Resend Failed", msg, "error");
      }
    } catch (err) {
      const msg = err.message || "Failed to resend code.";
      setError(msg);
      showAdminToast?.("Resend Failed", msg, "error");
    } finally {
      setIsResending(false);
    }
  };

  // ─── Step 3: Forgot Password (Input Gmail & Request Code) ───────────────────
  const handleForgot = async (e) => {
    e?.preventDefault?.();
    if (!email) {
      const msg = "Please enter your Gmail address.";
      setError(msg);
      showAdminToast?.("Input Required", msg, "error");
      return;
    }
    setIsLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const res = await requestPasswordReset(email);
      if (res.token) {
        setResetToken(res.token);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("sila_admin_reset_token", res.token);
        }
      }
      setResetTimeLeft(60);
      setResetCooldown(30);
      setResetOtp(["", "", "", "", "", ""]);
      const msg = res.message || "6-digit reset code sent to your Telegram!";
      setInfoMessage(msg);
      showAdminToast?.("Code Dispatched", msg, "info");
      sounds.playSuccess();
      changeStep("reset");
    } catch (err) {
      const msg = err.message || "Failed to send reset code.";
      setError(msg);
      showAdminToast?.("Verification Failed", msg, "error");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 4: Reset OTP Handling (6 Individual Boxes) ───────────────────────
  const handleResetOtpChange = (index, value) => {
    if (resetTimeLeft <= 0) return;
    const cleanVal = value.replace(/[^0-9]/g, "");
    if (!cleanVal && value !== "") return;

    sounds.playClick();
    const newOtp = [...resetOtp];
    newOtp[index] = cleanVal ? cleanVal.slice(-1) : "";
    setResetOtp(newOtp);
    if (error) setError("");

    if (cleanVal && index < 5) {
      resetOtpInputRefs.current[index + 1]?.focus();
    }

    if (cleanVal && newOtp.every((d) => d !== "")) {
      const fullCode = newOtp.join("");
      triggerVerifyResetOtp(fullCode);
    }
  };

  const handleResetOtpKeyDown = (index, e) => {
    if (resetTimeLeft <= 0) return;
    if (e.key === "Backspace") {
      if (resetOtp[index] === "" && index > 0) {
        resetOtpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      resetOtpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      resetOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleResetOtpPaste = (e) => {
    if (resetTimeLeft <= 0) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/[^0-9]/g, "");
    if (pasted.length >= 6) {
      const digits = pasted.slice(0, 6).split("");
      setResetOtp(digits);
      resetOtpInputRefs.current[5]?.focus();
      sounds.playClick();
      triggerVerifyResetOtp(digits.join(""));
    }
  };

  const triggerVerifyResetOtp = async (fullCode) => {
    if (!fullCode || fullCode.length !== 6) {
      const msg = "Please enter the complete 6-digit code.";
      setError(msg);
      showAdminToast?.("Code Incomplete", msg, "error");
      return;
    }
    if (resetTimeLeft <= 0) {
      const msg = "Verification code has expired. Please request a new code.";
      setError(msg);
      showAdminToast?.("Code Expired", msg, "error");
      return;
    }

    const activeToken = resetToken || (typeof window !== "undefined" && sessionStorage.getItem("sila_admin_reset_token"));
    if (!activeToken) {
      const msg = "Reset session expired. Please request a new code.";
      setError(msg);
      showAdminToast?.("Session Expired", msg, "error");
      changeStep("forgot");
      return;
    }

    setIsLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await verifyResetOtp(fullCode, activeToken);
      if (res.ok) {
        setVerifiedResetCode(fullCode);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("sila_admin_reset_code", fullCode);
        }
        sounds.playSuccess();
        showAdminToast?.("Code Verified", "Now create your new admin password.", "success");
        changeStep("new-password");
      } else {
        const msg = res.message || "Invalid or expired verification code.";
        setError(msg);
        showAdminToast?.("Verification Failed", msg, "error");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
      }
    } catch (err) {
      const msg = err.message || "Invalid or expired verification code.";
      setError(msg);
      showAdminToast?.("Verification Failed", msg, "error");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if ((resetTimeLeft > 0 && !resetCanResend) || isLoading) return;
    setIsLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await requestPasswordReset(email);
      if (res.token) {
        setResetToken(res.token);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("sila_admin_reset_token", res.token);
        }
      }
      setResetTimeLeft(60);
      setResetCooldown(30);
      setResetOtp(["", "", "", "", "", ""]);
      setInfoMessage("A fresh 6-digit reset code has been sent to your Telegram!");
      showAdminToast?.("Code Dispatched", "A fresh 6-digit code has been sent to Telegram!", "info");
      sounds.playClick();
      resetOtpInputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.message || "Failed to resend code.";
      setError(msg);
      showAdminToast?.("Resend Failed", msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 5: Set New Password ─────────────────────────────────────────────
  const handleSetNewPassword = async (e) => {
    e?.preventDefault?.();
    if (!newPassword || newPassword.length < 4) {
      const msg = "New password must be at least 4 characters.";
      setError(msg);
      showAdminToast?.("Invalid Password", msg, "error");
      return;
    }

    const activeToken = resetToken || (typeof window !== "undefined" && sessionStorage.getItem("sila_admin_reset_token"));
    const activeCode = verifiedResetCode || (typeof window !== "undefined" && sessionStorage.getItem("sila_admin_reset_code"));

    if (!activeToken || !activeCode) {
      const msg = "Verification expired. Please verify your OTP code again.";
      setError(msg);
      showAdminToast?.("Session Expired", msg, "error");
      changeStep("reset");
      return;
    }

    setIsLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await submitPasswordReset(activeCode, newPassword, activeToken);
      const msg = res.message || "Password updated successfully! Welcome back.";
      showAdminToast?.("Access Restored", msg, "success");
      sounds.playSuccess();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("sila_admin_reset_token");
        sessionStorage.removeItem("sila_admin_reset_code");
      }
      setPassword("");
      setResetOtp(["", "", "", "", "", ""]);
      setVerifiedResetCode("");
      setNewPassword("");
      setError("");
      setInfoMessage("");

      if (setIsAdminUnlocked) {
        setIsAdminUnlocked(true);
      }
      navigate(basePath);
    } catch (err) {
      const msg = err.message || "Failed to set new password.";
      setError(msg);
      showAdminToast?.("Reset Failed", msg, "error");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 animate-in fade-in zoom-in duration-300">
      <div
        className={`glass-shell relative rounded-[2.5rem] p-6 sm:p-8 border border-white/20 transition-all duration-300 ${
          isShaking ? "animate-shake" : ""
        }`}
      >
        {/* Top-Left Back Icon (<) */}
        <button
          type="button"
          onClick={() => {
            if (step === "new-password") {
              changeStep("reset");
              setError("");
              setInfoMessage("");
              sounds.playClick();
            } else if (step === "reset") {
              changeStep("forgot");
              setError("");
              setInfoMessage("");
              sounds.playClick();
            } else if (step === "otp" || step === "forgot") {
              changeStep("password");
              setError("");
              setInfoMessage("");
              sounds.playClick();
            } else {
              navigate("/");
            }
          }}
          className="absolute left-5 top-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full theme-toggle-btn flex items-center justify-center cursor-pointer text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-all active:scale-90 shadow-sm z-10"
          aria-label="Back"
          title={
            step === "new-password"
              ? "Back to Verification Code"
              : step === "reset"
              ? "Back to Email"
              : step === "otp" || step === "forgot"
              ? "Back to Password"
              : "Back to Home"
          }
        >
          <ArrowLeft2 size={18} />
        </button>

        {/* ─── Step: Password Login ─── */}
        {step === "password" && (
          <>
            <div className="flex flex-col items-center justify-center text-center pt-2 mb-6">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl scale-125 pointer-events-none" />
                <img
                  src="https://img.icons8.com/3d-fluency/188/lock-2.png"
                  alt="Admin Access"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-['Racing_Sans_One',sans-serif] tracking-wide text-[color:var(--app-text)]">
                ADMIN ACCESS
              </h2>
              <p className="text-xs sm:text-sm text-[color:var(--app-muted)] mt-1 max-w-xs">
                Enter password to unlock dashboard
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handlePasswordSubmit(e);
                    }
                  }}
                  enterKeyHint="go"
                  placeholder="Enter admin password..."
                  className="w-full h-12 pl-4 pr-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-rose-500 font-medium px-1 animate-in fade-in">
                  {error}
                </p>
              )}

              {(() => {
                const isPasswordBlocked = !!(lastFailedPassword && password === lastFailedPassword);
                return (
                  <button
                    type="submit"
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    disabled={isLoading || !password || isPasswordBlocked}
                    className={`w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 ${
                      isPasswordBlocked
                        ? "opacity-30 cursor-not-allowed filter blur-[1px] pointer-events-none"
                        : "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Unlock"
                    )}
                  </button>
                );
              })()}

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    changeStep("forgot");
                    setError("");
                    setInfoMessage("");
                    sounds.playClick();
                  }}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </>
        )}

        {/* ─── Step: Forgot Password (Enter Admin Gmail) ─── */}
        {step === "forgot" && (
          <>
            <div className="flex flex-col items-center justify-center text-center pt-2 mb-4">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl scale-125 pointer-events-none" />
                <img
                  src="https://img.icons8.com/3d-fluency/188/mail.png"
                  alt="Admin Gmail Verification"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-['Racing_Sans_One',sans-serif] tracking-wide text-[color:var(--app-text)]">
                VERIFY EMAIL
              </h2>
              <p className="text-xs sm:text-sm text-[color:var(--app-muted)] mt-1 max-w-xs">
                Enter registered admin email to receive Telegram OTP
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 font-mono text-xs shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-zinc-400">Hint:</span>
                <span className="font-semibold tracking-wider font-mono">{MASKED_ADMIN_EMAIL}</span>
              </div>
            </div>

            {infoMessage && (
              <div className="mb-4 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 animate-ping" />
                <span>{infoMessage}</span>
              </div>
            )}

            {error && (
              <p className="text-xs text-rose-500 font-medium px-1 mb-4 text-center animate-in fade-in">
                {error}
              </p>
            )}

            <form onSubmit={handleForgot} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={MASKED_ADMIN_EMAIL}
                  className="w-full h-12 pl-4 pr-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-center font-medium font-sans"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  "Send Telegram Code"
                )}
              </button>
            </form>
          </>
        )}

        {/* ─── Step: Reset OTP (6 Individual Blocks - Identical to 2FA Login OTP) ─── */}
        {step === "reset" && (
          <>
            <div className="flex flex-col items-center justify-center text-center pt-2 mb-5">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl scale-125 pointer-events-none" />
                <img
                  src="https://img.icons8.com/3d-fluency/188/key.png"
                  alt="Reset Password"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-['Racing_Sans_One',sans-serif] tracking-wide text-[color:var(--app-text)]">
                RESET PASSWORD
              </h2>
              <p className="text-xs sm:text-sm text-[color:var(--app-muted)] mt-1 max-w-xs">
                Enter the 6-digit code sent to your <span className="font-semibold text-cyan-500">Telegram</span>
              </p>
            </div>

            {resetTimeLeft <= 0 ? (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
                <span>Verification code has expired. Tap resend below.</span>
              </div>
            ) : infoMessage ? (
              <div className="mb-4 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 animate-ping" />
                <span>{infoMessage}</span>
              </div>
            ) : null}

            {error && (
              <p className="text-xs text-rose-500 font-medium px-1 mb-4 text-center animate-in fade-in">
                {error}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e?.preventDefault?.();
                triggerVerifyResetOtp(resetOtp.join(""));
              }}
              className="space-y-5"
            >
              {/* 6 Individual Digit Blocks: One block for only one number */}
              <div className="flex justify-between gap-1.5 sm:gap-2">
                {resetOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (resetOtpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    disabled={resetTimeLeft <= 0 || isLoading}
                    onChange={(e) => handleResetOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleResetOtpKeyDown(idx, e)}
                    onPaste={handleResetOtpPaste}
                    autoComplete="one-time-code"
                    className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl sm:rounded-2xl border transition-all duration-200 shadow-inner ${
                      resetTimeLeft <= 0
                        ? "opacity-35 cursor-not-allowed bg-slate-100/40 dark:bg-white/5 border-slate-200 dark:border-white/5 pointer-events-none"
                        : digit
                        ? "bg-cyan-500/10 border-cyan-500/60 text-cyan-500 dark:text-cyan-400 ring-2 ring-cyan-500/20"
                        : "bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-100"
                    } focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500`}
                  />
                ))}
              </div>

              {resetTimeLeft > 0 && (
                <div className="flex items-center justify-center text-xs px-1">
                  <span
                    className={`font-mono text-sm tracking-widest font-bold ${
                      resetTimeLeft < 20 ? "text-rose-500 animate-pulse" : "text-cyan-600/80 dark:text-cyan-400/80"
                    }`}
                  >
                    {formatTimer(resetTimeLeft)}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || resetOtp.some((d) => d === "") || resetTimeLeft <= 0}
                className="w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  "Verify Code"
                )}
              </button>

              <div className="flex items-center justify-between pt-1 px-1">
                <button
                  type="button"
                  onClick={handleResendResetCode}
                  disabled={isLoading || (resetTimeLeft > 0 && !resetCanResend)}
                  className={`text-xs font-medium cursor-pointer transition-colors ${
                    resetTimeLeft > 0 && !resetCanResend
                      ? "text-slate-400 dark:text-zinc-500 cursor-not-allowed"
                      : "text-cyan-600 dark:text-cyan-400 hover:underline"
                  }`}
                >
                  {resetCooldown > 0 && resetTimeLeft > 0
                    ? `Resend in ${resetCooldown}s`
                    : "Resend Telegram Code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    changeStep("forgot");
                    setError("");
                    setInfoMessage("");
                  }}
                  className="text-xs text-[color:var(--app-muted)] hover:text-slate-200 cursor-pointer font-medium"
                >
                  Change Email
                </button>
              </div>
            </form>
          </>
        )}

        {/* ─── Step: Create New Password (Only Shown AFTER Correct OTP!) ─── */}
        {step === "new-password" && (
          <>
            <div className="flex flex-col items-center justify-center text-center pt-2 mb-5">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl scale-125 pointer-events-none" />
                <img
                  src="https://img.icons8.com/3d-fluency/188/key.png"
                  alt="Create New Password"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-['Racing_Sans_One',sans-serif] tracking-wide text-[color:var(--app-text)]">
                CREATE NEW PASSWORD
              </h2>
              <p className="text-xs sm:text-sm text-[color:var(--app-muted)] mt-1 max-w-xs">
                Set a new password for your admin account
              </p>
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium px-1 mb-4 text-center animate-in fade-in">
                {error}
              </p>
            )}

            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter new admin password..."
                  className="w-full h-12 pl-4 pr-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showNewPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !newPassword || newPassword.length < 4}
                className="w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving Password...
                  </>
                ) : (
                  "Save Password & Unlock"
                )}
              </button>
            </form>
          </>
        )}

        {/* ─── Step: 2FA Telegram OTP ─── */}
        {step === "otp" && (
          <>
            <div className="flex flex-col items-center justify-center text-center pt-2 mb-5">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl scale-125 pointer-events-none" />
                <img
                  src="https://img.icons8.com/3d-fluency/188/shield.png"
                  alt="Security Verification"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain relative drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-['Racing_Sans_One',sans-serif] tracking-wide text-[color:var(--app-text)]">
                SECURITY VERIFICATION
              </h2>
              <p className="text-xs sm:text-sm text-[color:var(--app-muted)] mt-1 max-w-xs">
                Enter the 6-digit verification code to proceed
              </p>
            </div>

            {timeLeft <= 0 ? (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
                <span>Verification code has expired. Tap resend below.</span>
              </div>
            ) : infoMessage ? (
              <div className="mb-4 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs flex items-center justify-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 animate-ping" />
                <span>{infoMessage}</span>
              </div>
            ) : null}

            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="flex justify-between gap-1.5 sm:gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    disabled={timeLeft <= 0 || isLoading}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    autoComplete="one-time-code"
                    className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl sm:rounded-2xl border transition-all duration-200 shadow-inner ${
                      timeLeft <= 0
                        ? "opacity-35 cursor-not-allowed bg-slate-100/40 dark:bg-white/5 border-slate-200 dark:border-white/5 pointer-events-none"
                        : digit
                        ? "bg-cyan-500/10 border-cyan-500/60 text-cyan-500 dark:text-cyan-400 ring-2 ring-cyan-500/20"
                        : "bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-100"
                    } focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500`}
                  />
                ))}
              </div>

              {timeLeft > 0 && (
                <div className="flex items-center justify-center text-xs px-1">
                  <span className={`font-mono text-sm tracking-widest font-bold ${timeLeft < 20 ? "text-rose-500 animate-pulse" : "text-cyan-600/80 dark:text-cyan-400/80"}`}>
                    {formatTimer(timeLeft)}
                  </span>
                </div>
              )}

              {timeLeft > 0 && error && (
                <p className="text-xs text-rose-500 font-medium px-1 animate-in fade-in">
                  {error}
                </p>
              )}

              {timeLeft <= 0 ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleResend}
                  disabled={isResending}
                  className="w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend"
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isLoading || otp.some((d) => d === "")}
                  className="w-full h-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
