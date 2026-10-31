import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import RequireRole from "./components/RequireRole";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import CreateAssignment from "./pages/CreateAssignment";
import TeacherAssignment from "./pages/TeacherAssignment";
import StudentAssignment from "./pages/StudentAssignment";
import Report from "./pages/Report";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty-card"><div className="loader" />Loading...</div>;
  return user ? <Dashboard /> : <Landing />;
}

// Same URL, different page depending on who is looking.
function AssignmentRoute() {
  const { user } = useAuth();
  return user?.role === "teacher" ? <TeacherAssignment /> : <StudentAssignment />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login/:role" element={<AuthPage mode="login" />} />
        <Route path="/signup/:role" element={<AuthPage mode="signup" />} />

        <Route
          path="/assignments/new"
          element={<RequireRole role="teacher"><CreateAssignment /></RequireRole>}
        />
        <Route
          path="/assignments/:assignmentId"
          element={<RequireRole><AssignmentRoute /></RequireRole>}
        />
        <Route
          path="/reports/:reportId"
          element={<RequireRole role="teacher"><Report /></RequireRole>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
