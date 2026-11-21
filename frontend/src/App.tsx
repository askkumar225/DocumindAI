import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./store/authStore";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Pages
import Login            from "./pages/Login";
import Register         from "./pages/Register";
import AIHub            from "./pages/AIHub";
import Dashboard        from "./pages/Dashboard";
import ChatPage         from "./pages/ChatPage";
import Documents        from "./pages/Documents";
import DocumentAnalysis from "./pages/DocumentAnalysis";
import UploadPage       from "./pages/UploadPage";
import Search           from "./pages/Search";
import Comparisons      from "./pages/Comparisons";
import ComparisonDetail from "./pages/ComparisonDetail";
import ReviewCenter     from "./pages/ReviewCenter";
import ReviewDocument   from "./pages/ReviewDocument";
import Analytics        from "./pages/Analytics";

// General AI
import AIChat           from "./pages/AIChat";

// Career AI
import Resume           from "./pages/Resume";
import ResumeAnalysis   from "./pages/ResumeAnalysis";
import JobMatch         from "./pages/JobMatch";
import Applications     from "./pages/Applications";
import CoverLetter      from "./pages/CoverLetter";
import InterviewSetup   from "./pages/InterviewSetup";
import InterviewSession from "./pages/InterviewSession";

// Government Exam Preparation
import GovernmentExams  from "./pages/GovernmentExams";
import ExamDetails      from "./pages/ExamDetails";
import MockTest         from "./pages/MockTest";
import StudyProgress    from "./pages/StudyProgress";

// ─── Auth guard helpers ───────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnly() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/hub" replace /> : <Outlet />;
}

// ─── Layout A: Full-screen Hub (no navbar, no sidebar) ───────────────────────

function HubLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// ─── Layout B: Classic app shell (navbar + sidebar) ──────────────────────────

function AppLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ──────────────────────────────────────── */}
        <Route element={<PublicOnly />}>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* ── Hub: full-screen, no chrome ────────────────────────── */}
        <Route element={<HubLayout />}>
          <Route path="/hub" element={<AIHub />} />
          <Route path="/ai"  element={<AIChat />} />
        </Route>

        {/* ── App shell: navbar + sidebar ────────────────────────── */}
        <Route element={<AppLayout />}>
          {/* Overview */}
          <Route path="/dashboard"               element={<Dashboard />} />

          {/* Document Chat */}
          <Route path="/chat"                    element={<ChatPage />} />

          {/* Documents */}
          <Route path="/documents"               element={<Documents />} />
          <Route path="/documents/:id"           element={<DocumentAnalysis />} />
          <Route path="/upload"                  element={<UploadPage />} />
          <Route path="/search"                  element={<Search />} />

          {/* Comparison */}
          <Route path="/comparisons"             element={<Comparisons />} />
          <Route path="/comparisons/:id"         element={<ComparisonDetail />} />

          {/* Review & Approval */}
          <Route path="/review"                  element={<ReviewCenter />} />
          <Route path="/review/:id"              element={<ReviewDocument />} />

          {/* Career AI */}
          <Route path="/resume"                  element={<Resume />} />
          <Route path="/resume/:id"              element={<ResumeAnalysis />} />
          <Route path="/job-match"               element={<JobMatch />} />
          <Route path="/applications"            element={<Applications />} />
          <Route path="/cover-letter"            element={<CoverLetter />} />
          <Route path="/interview"               element={<InterviewSetup />} />
          <Route path="/interview/:id"           element={<InterviewSession />} />

          {/* Government Exams */}
          <Route path="/exams"                   element={<GovernmentExams />} />
          <Route path="/exams/:id"               element={<ExamDetails />} />
          <Route path="/exams/:id/mock-test"     element={<MockTest />} />
          <Route path="/progress"                element={<StudyProgress />} />

          {/* Analytics */}
          <Route path="/analytics"               element={<Analytics />} />
        </Route>

        {/* ── Catch-all ──────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/hub" replace />} />
        <Route path="*"  element={<Navigate to="/hub" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
