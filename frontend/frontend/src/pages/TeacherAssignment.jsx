import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Link2 } from "lucide-react";
import { getAssignment, getDuplicateGroups, getReports } from "../services/api";
import ScoreRing from "../components/ScoreRing";
import DuplicateGroups from "../components/DuplicateGroups";

export default function TeacherAssignment() {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [reports, setReports] = useState([]);
  const [duplicates, setDuplicates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [a, r, d] = await Promise.all([
        getAssignment(assignmentId),
        getReports(assignmentId),
        getDuplicateGroups(assignmentId),
      ]);
      setAssignment(a);
      setReports(r);
      setDuplicates(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [assignmentId]);

  // reportId -> index of its group, to badge the submission list
  const groupByReport = useMemo(() => {
    const map = new Map();
    (duplicates?.groups || []).forEach((group, index) => {
      group.members.forEach((member) => map.set(member.reportId, index + 1));
    });
    return map;
  }, [duplicates]);

  if (loading) return <div className="empty-card"><div className="loader" />Loading...</div>;
  if (!assignment) return <div className="alert error">{error || "Assignment not found."}</div>;

  const groupCount = duplicates?.totalGroups || 0;

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

      {error && <div className="alert error">{error}</div>}

      <div className="report-section">
        <div className="section-heading">
          <h2>Shared files</h2>
          <span>
            {groupCount === 0
              ? "No groups"
              : `${groupCount} group${groupCount !== 1 ? "s" : ""} · ${duplicates.submissionsInGroups} submissions`}
          </span>
        </div>
        <DuplicateGroups data={duplicates} />
      </div>

      <div className="report-section">
        <div className="section-heading">
          <h2>Submissions</h2>
          <span>{reports.length} total</span>
        </div>

        {reports.length === 0 ? (
          <div className="empty-card small-empty">
            <h3>No submissions yet</h3>
            <p>Student submissions will appear here once they upload their work.</p>
          </div>
        ) : (
          <div className="report-list">
            {reports.map((report) => (
              <Link className="report-card" to={`/reports/${report._id}`} key={report._id}>
                <ScoreRing score={report.overallSimilarityScore} />
                <div className="report-main">
                  <strong>{report.studentName}</strong>
                  <span>{report.studentFileName}</span>
                  <div className="badge-row">
                    <span className={`badge ${report.verdict?.toLowerCase()}`}>{report.verdict}</span>
                    {groupByReport.has(report._id) && (
                      <span className="badge shared"><Link2 size={11} /> Shared file · Group {groupByReport.get(report._id)}</span>
                    )}
                  </div>
                </div>
                <ExternalLink size={16} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
