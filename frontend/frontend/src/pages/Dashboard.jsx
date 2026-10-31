import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, Plus, RefreshCw } from "lucide-react";
import { getAssignments, getMySubmissions } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const isTeacher = user.role === "teacher";

  const [assignments, setAssignments] = useState([]);
  const [submittedIds, setSubmittedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, mine] = await Promise.all([
        getAssignments(),
        isTeacher ? Promise.resolve([]) : getMySubmissions(),
      ]);
      setAssignments(list);
      setSubmittedIds(new Set(mine.map((item) => item.assignmentId)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{isTeacher ? "Teacher workspace" : "Student workspace"}</p>
          <h1>Assignments</h1>
          <p className="muted">
            {isTeacher
              ? "Upload a source assignment, then review student submissions for meaningful overlap."
              : "Open an assignment to submit your work."}
          </p>
        </div>
        {isTeacher && (
          <Link to="/assignments/new" className="button primary">
            <Plus size={17} /> New assignment
          </Link>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="section-row">
        <span className="section-title">{assignments.length} assignment{assignments.length !== 1 ? "s" : ""}</span>
        <button className="button ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-card"><div className="loader" />Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <div className="empty-card">
          <div className="empty-icon"><FileText size={22} /></div>
          <h3>No assignments yet</h3>
          {isTeacher ? (
            <>
              <p>Create your first source assignment to start checking submissions.</p>
              <Link to="/assignments/new" className="button primary">Create assignment</Link>
            </>
          ) : (
            <p>Your teacher has not posted any assignments yet.</p>
          )}
        </div>
      ) : (
        <div className="assignment-grid">
          {assignments.map((item) => (
            <Link to={`/assignments/${item._id}`} className="assignment-card" key={item._id}>
              <div className="card-icon"><FileText size={19} /></div>
              <div className="card-content">
                <h3>{item.title}</h3>
                <p>{item.description || "No description"}</p>
                <span>
                  {isTeacher ? (item.sourceFileName || "Source document") : item.teacherName ? `By ${item.teacherName}` : "Assignment"}
                </span>
                {!isTeacher && submittedIds.has(item._id) && (
                  <span className="badge low submitted-badge"><CheckCircle2 size={12} /> Submitted</span>
                )}
              </div>
              <ArrowRight className="card-arrow" size={18} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
