export default function ScoreRing({ score = 0 }) {
  const safe = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className="score-ring-wrap">
      <svg className="score-ring" viewBox="0 0 120 120">
        <circle className="score-track" cx="60" cy="60" r={radius} />
        <circle
          className="score-progress"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-value">
        <strong>{Math.round(safe)}%</strong>
        <span>similarity</span>
      </div>
    </div>
  );
}