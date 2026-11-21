import { useRef, useState } from "react";
import api from "../services/api";

interface FileUploaderProps {
  onUploaded: () => void;
}

const ACCEPTED = ".pdf,.docx,.png,.jpg,.jpeg";
const MAX_MB = 10;

export default function FileUploader({ onUploaded }: FileUploaderProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── File selection ─────────────────────────────────────────────────────────

  function selectFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["pdf", "docx", "png", "jpg", "jpeg"];
    if (!allowed.includes(ext)) {
      setError(`File type .${ext} is not supported. Use PDF, DOCX, or image files.`);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large (max ${MAX_MB} MB).`);
      return;
    }
    setFile(f);
    setError(null);
    setSuccess(false);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a file."); return; }
    if (!title.trim()) { setError("Please enter a document title."); return; }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("file", file);

    setUploading(true);
    setError(null);

    try {
      await api.post("/documents/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(true);
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })
        ?.response?.data;
      const msg = data?.file?.[0] ?? data?.detail ?? "Upload failed.";
      setError(String(msg));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-5">
        Upload Document
      </h2>

      <form onSubmit={handleUpload} className="space-y-4">

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                      transition-colors
                      ${dragging
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-gray-300 hover:border-indigo-300 hover:bg-gray-50"
                      }`}
        >
          <div className="text-4xl mb-3">
            {file ? "📄" : "⬆"}
          </div>

          {file ? (
            <p className="text-sm font-medium text-indigo-700">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">
                Drag & Drop your document here
              </p>
              <p className="text-xs text-gray-400 mt-1">or</p>
            </>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            className="mt-3 text-sm text-indigo-600 font-medium hover:underline"
          >
            Browse Files
          </button>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileInput}
            className="hidden"
          />

          <p className="text-xs text-gray-400 mt-2">
            PDF, DOCX, PNG, JPG — max {MAX_MB} MB
          </p>
        </div>

        {/* Title input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. ABC Invoice August 2026"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                       text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Success */}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
            ✓ Document uploaded — processing started in the background.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg
                     font-medium text-sm hover:bg-indigo-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>
    </div>
  );
}
