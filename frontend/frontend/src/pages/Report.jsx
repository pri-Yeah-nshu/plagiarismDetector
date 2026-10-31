import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Files } from "lucide-react";
import { getReport } from "../services/api";
import ScoreRing from "../components/ScoreRing";

const icons = {
  LOW: <CheckCircle2 size={19} />,
  MEDIUM: <AlertTriangle size={19} />,
  HIGH: <XCircle size={19} />
};

export default function Report() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getReport(reportId).then(setReport).catch((err) => setError(err.message));
  }, [reportId]);

  if (error) return <div className="alert error">{error}</div>;
  if (!report) return <div className="empty-card"><div className="loader" />Loading report...</div>;

  return (
    <section>
      <Link to={`/assignments/${report.assignmentId}`} className="back-link"><ArrowLeft size={15} /> Back to assignment</Link>

      <div className="page-heading">
        <div>
          <p className="eyebrow">Analysis report</p>
          <h1>{report.studentName}</h1>
          <p className="muted">{report.studentFileName}</p>
        </div>
        <div className={`verdict ${report.verdict?.toLowerCase()}`}>
          {icons[report.verdict]}
          {report.verdict}
        </div>
      </div>

      {report.sharedFileWith?.length > 0 && (
        <div className="alert warning shared-banner">
          <Files size={16} />
          <div>
            <strong>Same file submitted by {report.sharedFileWith.length} other student{report.sharedFileWith.length !== 1 ? "s" : ""}: </strong>
            {report.sharedFileWith.map((other, i) => (
              <span key={other.reportId}>
                {i > 0 && ", "}
                <Link to={`/reports/${other.reportId}`}>{other.studentName}</Link>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="report-overview">
        <div className="panel score-panel">
          <ScoreRing score={report.overallSimilarityScore} />
          <div>
            <p className="eyebrow">Overall assessment</p>
            <h2>{report.overallSimilarityScore}% similarity</h2>
            <p>{report.summary || "No summary provided."}</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><span>Direct copy</span><strong>{report.directCopyScore}%</strong></div>
          <div className="stat-card"><span>Paraphrase</span><strong>{report.paraphraseScore}%</strong></div>
          <div className="stat-card"><span>Matched sections</span><strong>{report.matchedSections?.length || 0}</strong></div>
          <div className="stat-card"><span>Model</span><strong className="model-name">{report.modelUsed || "LLM"}</strong></div>
        </div>
      </div>

      <div className="report-section">
        <div className="section-heading">
          <h2>Matched sections</h2>
          <span>{report.matchedSections?.length || 0} findings</span>
        </div>

        {!report.matchedSections?.length ? (
          <div className="empty-card small-empty"><h3>No meaningful matches</h3><p>The model did not identify meaningful overlap.</p></div>
        ) : (
          <div className="matches">
            {report.matchedSections.map((match, index) => (
              <article className="match-card" key={index}>
                <div className="match-top">
                  <span className="match-number">0{index + 1}</span>
                  <span className="badge medium">{match.type.replaceAll("_", " ")}</span>
                  <strong>{match.similarity}% match</strong>
                </div>
                <div className="comparison">
                  <div><span>Source</span><p>{match.sourceText}</p></div>
                  <div><span>Student</span><p>{match.studentText}</p></div>
                </div>
                <p className="explanation">{match.explanation}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      {report.recommendations?.length > 0 && (
        <div className="panel recommendations">
          <p className="eyebrow">Teacher notes</p>
          <h2>Recommendations</h2>
          <ul>{report.recommendations.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}
    </section>
  );
}