import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import FileDrop from "../components/FileDrop";
import { createAssignment } from "../services/api";

export default function CreateAssignment() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!title.trim()) return setError("Please enter an assignment title.");
    if (!file) return setError("Please upload the source assignment.");

    setSaving(true);
    try {
      const assignment = await createAssignment({ title, description, file });
      navigate(`/assignments/${assignment._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="narrow">
      <button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back</button>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">New source</p>
          <h1>Create assignment</h1>
          <p className="muted">This document becomes the reference used for plagiarism analysis.</p>
        </div>
      </div>

      <form className="panel form" onSubmit={submit}>
        <label>
          <span>Assignment title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Climate Change Essay" />
        </label>

        <label>
          <span>Description <em>optional</em></span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" placeholder="Short context for this assignment..." />
        </label>

        <div>
          <span className="field-label">Source document</span>
          <FileDrop file={file} onChange={setFile} label="Drop your source assignment here" />
        </div>

        {error && <div className="alert error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="button ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="button primary" disabled={saving}>
            <Check size={16} /> {saving ? "Creating..." : "Create assignment"}
          </button>
        </div>
      </form>
    </section>
  );
}