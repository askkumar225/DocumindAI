/**
 * Applications — Private Job Application Tracker.
 *
 * CRUD for job applications with status tracking (Saved → Applied → Test →
 * Interview → Offer / Rejected).
 */

import { useEffect, useState, useCallback } from "react";
import careerApi from "../services/careerApi";
import type { JobApplication } from "../services/careerApi";

const STATUSES = ["SAVED", "APPLIED", "TEST", "INTERVIEW", "OFFER", "REJECTED"] as const;

const STATUS_STYLES: Record<string, string> = {
  SAVED:     "bg-gray-100 text-gray-700",
  APPLIED:   "bg-blue-100 text-blue-700",
  TEST:      "bg-purple-100 text-purple-700",
  INTERVIEW: "bg-indigo-100 text-indigo-700",
  OFFER:     "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-700",
};

export default function Applications() {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    company: "", job_title: "", job_url: "",
    status: "SAVED" as JobApplication["status"],
    notes: "", next_action: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await careerApi.listApplications();
      setApps(res.data);
    } catch {
      setError("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setForm({ company: "", job_title: "", job_url: "", status: "SAVED", notes: "", next_action: "" });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.job_title.trim()) return;
    try {
      if (editingId) {
        await careerApi.updateApplication(editingId, form);
      } else {
        await careerApi.createApplication(form);
      }
      resetForm();
      await load();
    } catch {
      setError("Failed to save application.");
    }
  }

  function handleEdit(app: JobApplication) {
    setForm({
      company: app.company, job_title: app.job_title, job_url: app.job_url,
      status: app.status, notes: app.notes, next_action: app.next_action,
    });
    setEditingId(app.id);
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this application?")) return;
    try {
      await careerApi.deleteApplication(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError("Failed to delete.");
    }
  }

  async function handleStatusChange(id: number, status: JobApplication["status"]) {
    try {
      await careerApi.updateApplication(id, { status });
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch {
      setError("Failed to update status.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Job Applications</h1>
          <p className="text-gray-500 text-sm">Track your private job applications and their status.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium
                           hover:bg-indigo-700 transition-colors">
          ＋ Add Application
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit}
              className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{editingId ? "Edit Application" : "New Application"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Company *" value={form.company}
                   onChange={(e) => setForm({ ...form, company: e.target.value })}
                   className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
            <input type="text" placeholder="Job Title *" value={form.job_title}
                   onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                   className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
            <input type="text" placeholder="Job URL (optional)" value={form.job_url}
                   onChange={(e) => setForm({ ...form, job_url: e.target.value })}
                   className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as JobApplication["status"] })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                               focus:outline-none focus:border-indigo-500">
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Next action (e.g. Follow up next week)" value={form.next_action}
                 onChange={(e) => setForm({ ...form, next_action: e.target.value })}
                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
          <textarea placeholder="Notes (optional)" value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
          <div className="flex gap-2">
            <button type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
              {editingId ? "Update" : "Add"}
            </button>
            <button type="button" onClick={resetForm}
                    className="px-4 py-2 rounded-lg text-gray-500 text-sm hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">💼</div>
          <p className="text-gray-400 text-sm">No applications yet. Click "Add Application" to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{app.job_title}</h3>
                  <p className="text-xs text-gray-500">{app.company}</p>
                  {app.job_url && (
                    <a href={app.job_url} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-indigo-500 hover:underline mt-0.5 inline-block">
                      View posting →
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.id, e.target.value as JobApplication["status"])}
                    className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer font-medium
                                 ${STATUS_STYLES[app.status]}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
              {app.next_action && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span className="text-indigo-400">→</span> {app.next_action}
                </p>
              )}
              {app.notes && (
                <p className="text-xs text-gray-400 mt-1">{app.notes}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleEdit(app)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(app.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                <span className="text-xs text-gray-300">Updated {new Date(app.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
