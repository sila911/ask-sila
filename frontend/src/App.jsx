import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { timeAgo } from "./utils/timeAgo";
import { useAdminToast } from "./hooks/useAdminToast";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { useAppData } from "./hooks/useAppData";
import { useLikes } from "./hooks/useLikes";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ThankYouModal from "./components/ThankYouModal";
import ReactionExplosion from "./components/ReactionExplosion";
import AdminToastCard from "./components/admin/AdminToastCard";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { DockTabs } from "./components/ui/dock-tabs";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import SingleQuestionPage from "./pages/SingleQuestionPage";
import NotFound404Page from "./pages/404Page";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // ─── Admin tab navigation ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("create");
  const [tabDirection, setTabDirection] = useState(0);
  const changeTabWithDirection = (newTab) => {
    if (newTab === activeTab) return;
    const ORDER = ["create", "library", "analytics", "admin"];
    const prev = ORDER.indexOf(activeTab);
    const next = ORDER.indexOf(newTab);
    setTabDirection(prev !== -1 && next !== -1 ? (next > prev ? 1 : -1) : 0);
    setActiveTab(newTab);
  };

  // ─── Misc UI state ────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [filterMode, setFilterMode] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const [seedDesign, setSeedDesign] = useState(null);

  // ─── Typing indicator ─────────────────────────────────────────────────────
  const [typingState, setTypingState] = useState({ questionId: null, text: "", isTyping: false });
  useEffect(() => {
    const channel = supabase
      .channel("sila-typing")
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        setTypingState(payload);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ─── Hooks ────────────────────────────────────────────────────────────────
  const { adminToast, setAdminToast, showAdminToast } = useAdminToast();
  const {
    isAdminUnlocked,
    setIsAdminUnlocked,
    isAuthChecking,
    handleAdminAuth,
    handleVerifyOtp,
    handleResendOtp,
    handleLogout,
  } = useAdminAuth();
  const {
    designs, events, questions, setQuestions, comments, setComments,
    isLoading, fetchError, hasNewQuestions, hasAskedQuestion,
    orderedDesigns, publicQuestions, loadData, trackEvent,
    submitUserQuestion, handleAddComment, handleView, markAnswered,
    handleToggleVisibility, handleTogglePin, handleSoftDelete,
    handleUpdateQuestion,
    addDesign, removeDesign,
  } = useAppData(showAdminToast);

  const { likedQuestions, likedComments, likedAnswers, handleLike, handleLikeComment, handleLikeAnswer } =
    useLikes(questions, setQuestions, comments, setComments);

  // ─── Admin token from URL ─────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("adminToken");
    if (token) setLinkMessage(`Admin token detected: ${token}`);
  }, []);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const isAdminPath = location.pathname.startsWith("/fuckoff");
  const isCurrentlyAdmin = isAdminPath && isAdminUnlocked;

  const handleVerifyOtpWithNav = async (otp, token) => {
    const res = await handleVerifyOtp(otp, token);
    if (res.ok) {
      changeTabWithDirection("create");
      trackEvent("admin_login_2fa");
      loadData(true);
      showAdminToast("Admin Unlocked", "Welcome back to admin workspace.", "success");
    }
    return res;
  };

  const reuseDesign = (design) => {
    setSeedDesign(design);
    changeTabWithDirection("create");
    trackEvent("design_reused", { id: design.id });
    showAdminToast("Loaded in editor", "Answer card opened for update.", "success");
  };

  const adminPageElement = (
    <AdminPage
      isAdminUnlocked={isAdminUnlocked}
      isAuthChecking={isAuthChecking}
      handleAdminAuth={handleAdminAuth}
      handleVerifyOtp={handleVerifyOtpWithNav}
      handleResendOtp={handleResendOtp}
      activeTab={activeTab}
      tabDirection={tabDirection}
      changeTabWithDirection={changeTabWithDirection}
      seedDesign={seedDesign}
      addDesign={addDesign}
      trackEvent={trackEvent}
      showAdminToast={showAdminToast}
      questions={questions}
      comments={comments}
      markAnswered={markAnswered}
      designs={designs}
      orderedDesigns={orderedDesigns}
      reuseDesign={reuseDesign}
      removeDesign={removeDesign}
      events={events}
      handleToggleVisibility={handleToggleVisibility}
      handleTogglePin={handleTogglePin}
      handleSoftDelete={handleSoftDelete}
      handleUpdateQuestion={handleUpdateQuestion}
      setSeedDesign={setSeedDesign}
      linkMessage={linkMessage}
    />
  );

  return (
    <div className="min-h-screen flex flex-col text-[color:var(--app-text)] relative">
      <Header />

      {/* Real-time new question toast */}
      {hasNewQuestions && (
        <div className="fixed top-24 left-0 w-full z-[150] flex justify-center px-4 pointer-events-none">
          <button
            onClick={() => loadData()}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-full shadow-2xl shadow-cyan-500/40 animate-in slide-in-from-top-10 duration-500 font-bold text-sm border border-white/20"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            New question asked! Click to refresh
          </button>
        </div>
      )}

      <main className={`flex-1 flex items-center justify-center px-2 sm:px-4 ${isCurrentlyAdmin ? "pb-28" : "pb-6"}`}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                publicQuestions={publicQuestions}
                designs={designs}
                comments={comments}
                onAddComment={handleAddComment}
                likedQuestions={likedQuestions}
                handleLike={handleLike}
                likedComments={likedComments}
                handleLikeComment={handleLikeComment}
                handleView={handleView}
                timeAgo={timeAgo}
                handleSuccess={() => setShowModal(true)}
                submitUserQuestion={submitUserQuestion}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                isFilterOpen={isFilterOpen}
                setIsFilterOpen={setIsFilterOpen}
                hasAskedQuestion={hasAskedQuestion}
                typingState={typingState}
                likedAnswers={likedAnswers}
                handleLikeAnswer={handleLikeAnswer}
                isLoading={isLoading}
                fetchError={fetchError}
                loadData={loadData}
              />
            }
          />

          <Route path="/fuckoff/*" element={adminPageElement} />

          <Route
            path="/q/:id"
            element={
              <SingleQuestionPage
                questions={publicQuestions}
                designs={designs}
                comments={comments}
                onAddComment={handleAddComment}
                likedQuestions={likedQuestions}
                handleLike={handleLike}
                likedComments={likedComments}
                handleLikeComment={handleLikeComment}
                handleView={handleView}
                timeAgo={timeAgo}
                hasAskedQuestion={hasAskedQuestion}
                typingState={typingState}
                likedAnswers={likedAnswers}
                handleLikeAnswer={handleLikeAnswer}
              />
            }
          />

          <Route path="*" element={<NotFound404Page />} />
        </Routes>
      </main>

      {/* Show footer only on standard public valid routes (hide on 404 and /fuckoff) */}
      {(location.pathname === "/" || location.pathname.startsWith("/q/")) && <Footer />}

      <ThankYouModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {adminToast && (
        <AdminToastCard
          toast={adminToast}
          onClose={() => setAdminToast(null)}
        />
      )}

      {isCurrentlyAdmin && (
        <DockTabs
          activeTab={activeTab}
          onChange={changeTabWithDirection}
          onLogout={async () => {
            await handleLogout();
            setIsAdminUnlocked(false);
            changeTabWithDirection("create");
            navigate("/");
          }}
        />
      )}

      <ReactionExplosion />
      <PWAInstallBanner />
    </div>
  );
}
