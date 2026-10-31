import { useRef } from "react";
import { FileText, Upload, X } from "lucide-react";

export default function FileDrop({ file, onChange, accept=".pdf,.docx,.txt", label="Upload document" }) {
  const inputRef = useRef(null);

  function handleFiles(files) {
    const selected = files?.[0];
    if (selected) onChange(selected);
  }

  return (
    <div className={`dropzone ${file ? "has-file" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !file && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {!file ? (
        <>
          <div className="drop-icon"><Upload size={20} /></div>
          <strong>{label}</strong>
          <span>PDF, DOCX or TXT · up to 10 MB</span>
          <button type="button" className="text-button">Choose file</button>
        </>
      ) : (
        <div className="selected-file">
          <div className="file-icon"><FileText size={18} /></div>
          <div className="file-meta">
            <strong>{file.name}</strong>
            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            aria-label="Remove file"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}