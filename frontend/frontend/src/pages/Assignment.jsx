import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, LoaderCircle, Upload } from "lucide-react";
import { checkPlagiarism, getAssignment, getReports } from "../services/api";
import FileDrop from "../components/FileDrop";
import ScoreRing from "../components/ScoreRing";

export default function Assignment() {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [reports, setReports] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [a, r] = await Promise.all([getAssignment(assignmentId), getReports(assignmentId)]);
      setAssignment(a);
      setReports(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [assignmentId]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!studentName.trim()) return setError("Enter the student's name.");
    if (!file) return setError("Upload the student's assignment.");

    setChecking(true);
    try {
      await checkPlagiarism({ assignmentId, studentName, file });
      setStudentName("");
      setFile(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  if (loading) return <div className="empty-card"><div className="loader" />Loading...</div>;
  if (!assignment) return <div className="alert error">{error || "Assignment not found."}</div>;

  return (
    <section>
      <Link to="/" className="back-link"><ArrowLeft size={15} /> All assignments</Link>

      <div className="page-heading">
        <div>
          <p className="eyebrow">Source assignment</p>
          <h1>{assignment.title}</h1>
          <p className="muted">{assignment.description || "No description provided."}</p>
        </div>
        <span className="file-pill">{assignment.sourceFileName}</span>
      </div>

      <div className="two-column">
        <form className="panel form" onSubmit={submit}>
          <div className="panel-heading">
            <div>
              <h2>Check a submission</h2>
              <p>Compare a student's document against the source.</p>
            </div>
            <div className="panel-icon"><Upload size={18} /></div>
          </div>

          <label>
            <span>Student name</span>
            <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g. Jane Doe" />
          </label>

          <div>
            <span className="field-label">Student assignment</span>
            <FileDrop file={file} onChange={setFile} label="Drop student's assignment here" />
          </div>

          {error && <div className="alert error">{error}</div>}

          <button className="button primary full" disabled={checking}>
            {checking ? <><LoaderCircle size={16} className="spin" /> Analyzing...</> : "Run plagiarism check"}
          </button>

          <p className="form-note">Analysis is AI-assisted. Similarity does not by itself prove intentional plagiarism.</p>
        </form>

        <div>
          <div className="section-row">
            <span className="section-title">Recent reports</span>
            <span className="muted small">{reports.length} total</span>
          </div>

          {reports.length === 0 ? (
            <div className="empty-card small-empty">
              <h3>No reports yet</h3>
              <p>Student checks will appear here.</p>
            </div>
          ) : (
            <div className="report-list">
              {reports.map((report) => (
                <Link className="report-card" to={`/reports/${report._id}`} key={report._id}>
                  <ScoreRing score={report.overallSimilarityScore} />
                  <div className="report-main">
                    <strong>{report.studentName}</strong>
                    <span>{report.studentFileName}</span>
                    <span className={`badge ${report.verdict?.toLowerCase()}`}>{report.verdict}</span>
                  </div>
                  <ExternalLink size={16} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}