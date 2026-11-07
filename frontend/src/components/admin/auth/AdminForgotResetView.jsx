import { Eye, EyeSlash, DirectSend, Key } from "iconsax-react";

export default function AdminForgotResetView({
  view,
  setView,
  email,
  setEmail,
  code,
  setCode,
  newPassword,
  setNewPassword,
  showNewPassword,
  setShowNewPassword,
  error,
  message,
  isSubmitting,
  handleForgot,
  handleReset,
}) {
  if (view === "forgot") {
    return (
      <>
        <div className="flex flex-col items-center justify-center text-center pt-2 mb-6">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl scale-125 pointer-events-none" />
            <img
              src="https://img.icons8.com/3d-fluency/188/mail.png"
              alt="Email Verification"
              className="w-18 h-18 sm:w-20 sm:h-20 object-contain relative drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h3 className="text-2xl font-bold font-['Racing_Sans_One',sans-serif] tracking-wide text-[color:var(--app-text)]">
            Reset Password
          </h3>
          <p className="text-xs sm:text-sm text-[color:var(--app-muted)] mt-1 max-w-xs">
            Enter your admin Gmail address to receive a 6-digit verification code
          </p>
        </div>

        <form onSubmit={handleForgot} className="space-y-4">
          <label className="block text-sm">
            <span className="text-[color:var(--app-muted)] font-medium">Admin Gmail</span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter registered admin email..."
              className="h-11 w-full rounded-xl px-3 mt-1 bg-[color:var(--input-bg)] border border-[color:var(--input-border)] focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm"
              required
            />
          </label>

          {error && <p className="text-xs text-rose-500 font-medium px-1 animate-in fade-in">{error}</p>}
          {message && <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium px-1 animate-in fade-in">{message}</p>}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full rounded-xl h-11 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending Code...
                </>
              ) : (
                "Send Code"
              )}
            </button>
          </div>
        </form>
      </>
    );
  }

  if (view === "reset") {
    return (
      <>
        <div className="flex flex-col items-center justify-center text-center pt-2 mb-5">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl scale-125 pointer-events-none" />
            <img
              src="https://img.icons8.com/3d-fluency/188/key.png"
              alt="Set New Password"
              className="w-18 h-18 sm:w-20 sm:h-20 object-contain relative drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h3 className="text-2xl font-bold font-['Racing_Sans_One',sans-serif] tracking-wide text-[color:var(--app-text)]">
            New Password
          </h3>
          <p className="text-xs sm:text-sm text-[color:var(--app-muted)] mt-1 max-w-xs">
            Enter the 6-digit code sent to <span className="font-semibold text-cyan-500">{email}</span> and your new password
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <label className="block text-sm">
            <span className="text-[color:var(--app-muted)] font-medium">6-Digit Code</span>
            <input
              type="text"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-1 h-11 w-full rounded-xl px-3 bg-[color:var(--input-bg)] border border-[color:var(--input-border)] text-center tracking-widest text-lg font-bold font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="000000"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="text-[color:var(--app-muted)] font-medium">New Password</span>
            <div className="relative mt-1">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 w-full rounded-xl pl-3 pr-10 bg-[color:var(--input-bg)] border border-[color:var(--input-border)] focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm"
                placeholder="At least 4 characters..."
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1"
                aria-label="Toggle password visibility"
              >
                {showNewPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="text-xs text-rose-500 font-medium px-1 animate-in fade-in">{error}</p>}
          {message && <p className="text-xs text-emerald-500 font-medium px-1 animate-in fade-in">{message}</p>}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || code.length < 6 || !newPassword}
              className="w-full rounded-xl h-11 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-base shadow-lg shadow-cyan-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="w-full text-center text-xs text-[color:var(--app-muted)] hover:text-slate-200 cursor-pointer"
            >
              Change Email
            </button>
          </div>
        </form>
      </>
    );
  }

  return null;
}
