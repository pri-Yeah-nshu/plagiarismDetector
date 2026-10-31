import { Link } from "react-router-dom";
import { ExternalLink, Files, ShieldCheck } from "lucide-react";

const TYPE_LABELS = {
  identical_file: "Identical file",
  identical_text: "Identical text",
};

const TYPE_HINTS = {
  identical_file: "These students uploaded the exact same file, byte for byte.",
  identical_text: "The text is identical, but the files differ (re-saved or exported separately).",
};

export default function DuplicateGroups({ data }) {
  const groups = data?.groups || [];

  if (groups.length === 0) {
    return (
      <div className="empty-card small-empty">
        <div className="empty-icon"><ShieldCheck size={20} /></div>
        <h3>No shared files detected</h3>
        <p>No two students have submitted the same file for this assignment.</p>
      </div>
    );
  }

  return (
    <div className="dup-list">
      {groups.map((group, index) => (
        <article className="panel dup-group" key={group.groupId}>
          <header className="dup-header">
            <div className="dup-title">
              <span className="dup-icon"><Files size={17} /></span>
              <div>
                <strong>Group {index + 1} · {group.memberCount} students</strong>
                <span>{TYPE_HINTS[group.type]}</span>
              </div>
            </div>
            <span className={`badge ${group.type === "identical_file" ? "high" : "medium"}`}>
              {TYPE_LABELS[group.type]}
            </span>
          </header>

          <ul className="dup-members">
            {group.members.map((member, memberIndex) => (
              <li key={member.reportId}>
                <div className="dup-member-main">
                  <strong>{member.studentName}</strong>
                  <span>
                    {member.studentEmail ? `${member.studentEmail} · ` : ""}
                    {member.studentFileName}
                  </span>
                </div>
                <div className="dup-member-meta">
                  <span className="muted small">
                    {memberIndex === 0 ? "Submitted first · " : ""}
                    {new Date(member.submittedAt).toLocaleString()}
                  </span>
                  <Link to={`/reports/${member.reportId}`} className="dup-link">
                    Report <ExternalLink size={13} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </article>
      ))}
      <p className="form-note dup-note">
        Submission order shows who uploaded first. It does not show who copied from whom, so please review before drawing conclusions.
      </p>
    </div>
  );
}
