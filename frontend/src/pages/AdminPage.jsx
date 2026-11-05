import { motion, AnimatePresence } from "framer-motion";
import CreateDesign from "../components/admin/CreateDesign";
import Library from "../components/admin/Library";
import AdminDashboard from "../components/admin/AdminDashboard";
import AnalyticsDashboard from "../components/admin/AnalyticsDashboard";
import AdminLockScreen from "../components/admin/auth/AdminLockScreen";

const TAB_VARIANTS = {
  enter: (dir) => ({ x: dir > 0 ? 150 : -150, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -150 : 150, opacity: 0 }),
};

const TAB_TRANSITION = {
  x: { type: "spring", stiffness: 350, damping: 30 },
  opacity: { duration: 0.15 },
};

export default function AdminPage({
  isAdminUnlocked,
  setIsAdminUnlocked,
  isAuthChecking,
  handleAdminAuth,
  handleVerifyOtp,
  handleResendOtp,
  activeTab,
  tabDirection,
  changeTabWithDirection,
  seedDesign,
  addDesign,
  trackEvent,
  showAdminToast,
  questions,
  comments = [],
  markAnswered,
  designs,
  orderedDesigns,
  reuseDesign,
  removeDesign,
  events,
  handleToggleVisibility,
  handleTogglePin,
  handleSoftDelete,
  handleUpdateQuestion,
  setSeedDesign,
  linkMessage,
}) {
  // ─── Loading Session Check ────────────────────────────────────────────────
  if (isAuthChecking) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-[color:var(--app-muted)]">
          Verifying security access...
        </p>
      </div>
    );
  }

  // ─── Locked: Password & 2FA Flow ──────────────────────────────────────────
  if (!isAdminUnlocked) {
    return (
      <AdminLockScreen
        handleAdminAuth={handleAdminAuth}
        handleVerifyOtp={handleVerifyOtp}
        handleResendOtp={handleResendOtp}
        showAdminToast={showAdminToast}
        setIsAdminUnlocked={setIsAdminUnlocked}
      />
    );
  }

  // ─── Unlocked: Admin Studio & Dashboard Tabs ─────────────────────────────
  return (
    <div className="glass-shell glass-shell--3d w-[95%] max-w-6xl rounded-[2rem] p-5 sm:p-8">
      {linkMessage && (
        <p className="mb-3 text-sm text-[color:var(--app-muted)]">{linkMessage}</p>
      )}

      <div className="relative overflow-hidden w-full min-h-[500px]">
        <AnimatePresence initial={false} custom={tabDirection} mode="wait">
          <motion.div
            key={activeTab}
            custom={tabDirection}
            variants={TAB_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={TAB_TRANSITION}
            className="w-full"
          >
            {activeTab === "create" && (
              <CreateDesign
                seedDesign={seedDesign}
                onSave={addDesign}
                onEvent={trackEvent}
                onNotify={showAdminToast}
                questions={questions}
                onQuestionAnswered={markAnswered}
              />
            )}

            {activeTab === "library" && (
              <Library
                designs={orderedDesigns}
                onReuse={reuseDesign}
                onDelete={removeDesign}
              />
            )}

            {activeTab === "analytics" && (
              <AnalyticsDashboard
                questions={questions}
                designs={designs}
                comments={comments}
                events={events}
              />
            )}

            {activeTab === "admin" && (
              <AdminDashboard
                designs={designs}
                events={events}
                questions={questions}
                comments={comments}
                onToggleVisibility={handleToggleVisibility}
                onTogglePin={handleTogglePin}
                onSoftDelete={handleSoftDelete}
                onUpdateQuestion={handleUpdateQuestion}
                onAnswerQuestion={(q) => {
                  if (setSeedDesign) setSeedDesign({ questionId: q.id });
                  changeTabWithDirection("create");
                  if (showAdminToast) {
                    showAdminToast("Question Loaded", "Opened in studio to answer.", "info");
                  }
                }}
                showAdminToast={showAdminToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
