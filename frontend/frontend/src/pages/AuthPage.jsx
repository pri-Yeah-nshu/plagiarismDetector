import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROLES = ["student", "teacher"];

export default function AuthPage({ mode }) {
  const { role } = useParams();
  const { user, submitAuth } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    accessCode: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!ROLES.includes(role)) return <Navigate to="/" replace />;
  if (user) return <Navigate to="/" replace />;

  const isSignup = mode === "signup";
  const otherRole = role === "student" ? "teacher" : "student";
  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (isSignup && !form.name.trim())
      return setError("Please enter your name.");
    if (!form.email.trim()) return setError("Please enter your email.");
    if (!form.password) return setError("Please enter your password.");
    if (isSignup && form.password.length < 8)
      return setError("Password must be at least 8 characters.");

    setBusy(true);
    try {
      await submitAuth(role, mode, {
        name: form.name,
        email: form.email,
        password: form.password,
        ...(isSignup && role === "teacher"
          ? { accessCode: form.accessCode }
          : {}),
      });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (role === "teacher" && mode === "signup")
    return <Navigate to="/login/teacher" replace />;
  return (
    <section className="narrow auth-wrap">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="page-heading compact">
        <div>
          <p className="eyebrow">
            {role} {isSignup ? "sign up" : "login"}
          </p>
          <h1>
            {isSignup ? `Create your ${role} account` : `Welcome back, ${role}`}
          </h1>
        </div>
      </div>

      <form className="panel form" onSubmit={submit}>
        {isSignup && (
          <label>
            <span>Full name</span>
            <input
              value={form.name}
              onChange={update("name")}
              autoComplete="name"
              placeholder="e.g. Jane Doe"
            />
          </label>
        )}

        <label>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            autoComplete="email"
            placeholder="you@school.edu"
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={update("password")}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
          />
        </label>

        {isSignup && role === "teacher" && (
          <label>
            <span>Teacher access code</span>
            <input
              value={form.accessCode}
              onChange={update("accessCode")}
              autoComplete="off"
              placeholder="Provided by your institution"
            />
          </label>
        )}

        {error && <div className="alert error">{error}</div>}

        <button className="button primary full" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle size={16} className="spin" /> Please wait...
            </>
          ) : isSignup ? (
            "Create account"
          ) : (
            "Log in"
          )}
        </button>

        <p className="form-note auth-switch">
          {role === "student" ? (
            isSignup ? (
              <>
                Already have an account? <Link to="/login/student">Log in</Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/signup/student">Create a student account</Link>
              </>
            )
          ) : null}
          {role === "student" && <br />}
          {role === "student" ? (
            <>
              Are you the teacher?{" "}
              <Link to="/login/teacher">Teacher login</Link>
            </>
          ) : (
            <>
              Are you a student? <Link to="/login/student">Student login</Link>
            </>
          )}
        </p>
      </form>
    </section>
  );
}
