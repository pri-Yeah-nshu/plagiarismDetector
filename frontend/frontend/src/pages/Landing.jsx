import { Link } from "react-router-dom";
import { GraduationCap, BookOpenCheck } from "lucide-react";

const roles = [
  {
    key: "student",
    icon: <GraduationCap size={22} />,
    title: "I'm a student",
    text: "Sign in to see assignments and submit your work.",
  },
  {
    key: "teacher",
    icon: <BookOpenCheck size={22} />,
    title: "I'm a teacher",
    text: "Create assignments, review similarity reports and spot shared files.",
  },
];

export default function Landing() {
  return (
    <section className="landing">
      <div className="landing-copy">
        <p className="eyebrow">ClearCopy</p>
        <h1>Academic similarity review, for the whole classroom.</h1>
        <p className="muted">Choose how you want to continue.</p>
      </div>

      <div className="role-grid">
        {roles.map((role) => (
          <div className="panel role-card" key={role.key}>
            <div className="card-icon">{role.icon}</div>
            <h2>{role.title}</h2>
            <p>{role.text}</p>
            <div className="role-actions">
              <Link to={`/login/${role.key}`} className="button primary">
                Log in
              </Link>
              {role.key === "student" && (
                <Link to="/signup/student" className="button ghost">
                  Sign up
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
