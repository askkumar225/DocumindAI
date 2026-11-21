/**
 * Resume — Resume list + upload page.
 *
 * Shows all uploaded resumes, allows uploading new ones (PDF/DOCX),
 * and links to detailed analysis for each resume.
 */

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import careerApi from "../services/careerApi";
import type { Resume as ResumeType } from "../services/careerApi";

export default function Resume() {
  const [resumes, setResumes] = useState<ResumeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await careerApi.listResumes();
      setResumes(res.data);
    } catch {
      setError("Failed to load resumes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await careerApi.uploadResume(file, title.trim());
      setFile(null);
      setTitle("");
      await load();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this resume?")) return;
    try {
      await careerApi.deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Failed to delete resume.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">My Resumes</h1>
      <p className="text-gray-500 text-sm mb-6">
        Upload your resume to get AI-powered analysis, skill extraction, and interview preparation.
      </p>

      {/* Upload form */}
      <form onSubmit={handleUpload}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Upload New Resume</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Resume title (e.g. My Software Resume)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
          />
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4
                       file:rounded-lg file:border-0 file:bg-indigo-50
                       file:text-indigo-700 file:font-medium file:cursor-pointer
                       hover:file:bg-indigo-100"
          />
          <button
            type="submit"
            disabled={!file || !title.trim() || uploading}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors
                        ${file && title.trim() && !uploading
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Supported formats: PDF, DOCX</p>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Resume list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading resumes…</div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📄</div>
          <p className="text-gray-400 text-sm">No resumes uploaded yet. Upload one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <div key={resume.id}
                 className="bg-white rounded-xl border border-gray-200 p-5
                            flex items-center justify-between hover:border-indigo-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">
                  📄
                </div>
                <div>
                  <Link to={`/resume/${resume.id}`}
                        className="text-sm font-semibold text-gray-800 hover:text-indigo-600">
                    {resume.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {resume.has_analysis && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Analyzed
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(resume.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/resume/${resume.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600
                                 font-medium hover:bg-indigo-100 transition-colors">
                  View
                </Link>
                <button onClick={() => handleDelete(resume.id)}
                        className="text-xs px-3 py-1.5 rounded-lg text-gray-400
                                   hover:bg-red-50 hover:text-red-500 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
