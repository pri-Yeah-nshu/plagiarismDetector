import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// <RequireRole role="teacher">...</RequireRole>  or  <RequireRole>...</RequireRole> (any logged-in user)
export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="empty-card"><div className="loader" />Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
