import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, LoaderCircle, Upload } from "lucide-react";
import { getAssignment, getMySubmissions, submitAssignment } from "../services/api";
import FileDrop from "../components/FileDrop";

export default function StudentAssignment() {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [a, mine] = await Promise.all([getAssignment(assignmentId), getMySubmissions()]);
      setAssignment(a);
      setSubmission(mine.find((item) => item.assignmentId === assignmentId) || null);
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
    if (!file) return setError("Please choose your file first.");

    setSubmitting(true);
    try {
      await submitAssignment({ assignmentId, file });
      setFile(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="empty-card"><div className="loader" />Loading...</div>;
  if (!assignment) return <div className="alert error">{error || "Assignment not found."}</div>;

  return (
    <section className="narrow">
      <Link to="/" className="back-link"><ArrowLeft size={15} /> All assignments</Link>

      <div className="page-heading compact">
        <div>
          <p className="eyebrow">{assignment.teacherName ? `Assigned by ${assignment.teacherName}` : "Assignment"}</p>
          <h1>{assignment.title}</h1>
          <p className="muted">{assignment.description || "No description provided."}</p>
        </div>
      </div>

      {submission ? (
        <div className="panel form submitted-panel">
          <div className="submitted-icon"><CheckCircle2 size={26} /></div>
          <h2>Submission received</h2>
          <p className="muted">
            <strong>{submission.fileName}</strong> was submitted on{" "}
            {new Date(submission.submittedAt).toLocaleString()}. Your teacher will review it.
          </p>
        </div>
      ) : (
        <form className="panel form" onSubmit={submit}>
          <div className="panel-heading">
            <div>
              <h2>Submit your work</h2>
              <p>You can submit once per assignment, so check your file before sending.</p>
            </div>
            <div className="panel-icon"><Upload size={18} /></div>
          </div>

          <div>
            <span className="field-label">Your assignment</span>
            <FileDrop file={file} onChange={setFile} label="Drop your assignment here" />
          </div>

          {error && <div className="alert error">{error}</div>}

          <button className="button primary full" disabled={submitting}>
            {submitting ? <><LoaderCircle size={16} className="spin" /> Submitting, this can take a minute...</> : "Submit assignment"}
          </button>

          <p className="form-note">Submissions are checked automatically and reviewed by your teacher.</p>
        </form>
      )}
    </section>
  );
}
