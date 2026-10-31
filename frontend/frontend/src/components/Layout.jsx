import { Link, NavLink, useNavigate } from "react-router-dom";
import { FileCheck2, Plus, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark"><FileCheck2 size={18} /></span>
          <span>ClearCopy</span>
        </Link>

        {user && (
          <div className="topbar-right">
            <nav className="nav">
              <NavLink to="/" end className={linkClass}>
                <LayoutDashboard size={16} /> {user.role === "teacher" ? "Dashboard" : "Assignments"}
              </NavLink>
              {user.role === "teacher" && (
                <NavLink to="/assignments/new" className={linkClass}>
                  <Plus size={16} /> New assignment
                </NavLink>
              )}
            </nav>

            <div className="user-chip">
              <div className="user-meta">
                <strong>{user.name}</strong>
                <span className={`role-tag ${user.role}`}>{user.role}</span>
              </div>
              <button className="icon-button" onClick={handleLogout} aria-label="Log out" title="Log out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="main">{children}</main>

      <footer className="footer">
        <span>ClearCopy</span>
        <span>AI-assisted academic similarity review</span>
      </footer>
    </div>
  );
}
