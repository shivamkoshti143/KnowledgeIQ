import { useState } from "react";
import { UploadCloud, X, FileText, Send, Layers, Tag, Building2, Folder, File, CheckCircle2 } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";

export function SubmissionForm({ data, onCreated, setToast, setRoute, mode = "task" }) {
  const isKnowledge = mode === "knowledge";
  const [form, setForm] = useState({
    title: "",
    description: "",
    contentType: isKnowledge ? "file" : "task",
    categoryId: data.categories?.[0]?.id || "",
    departmentId: data.departments?.[0]?.id || "",
    tags: "",
    files: []
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setToast("Please enter a title.");
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "files" && Array.isArray(value)) {
          value.forEach((file) => body.append("files", file));
        } else if (value !== undefined && value !== null) {
          body.append(key, value);
        }
      });
      body.append("status", "pending");

      const endpoint = isKnowledge ? "/knowledge" : "/tasks";
      await request(endpoint, { method: "POST", body });
      setForm({
        title: "",
        description: "",
        departmentId: data.departments?.[0]?.id || "",
        categoryId: data.categories?.[0]?.id || "",
        tags: "",
        files: []
      });
      await onCreated();
      setToast("Knowledge is sent for review.");
      if (isKnowledge) {
        setRoute?.("knowledge-feed");
      } else {
        setRoute?.("tasks");
      }
    } catch (error) {
      setToast(error.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  const addFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setForm((current) => ({ ...current, files: [...current.files, ...selected] }));
    event.target.value = "";
  };

  const removeFile = (index) => {
    setForm((current) => ({ ...current, files: current.files.filter((_, i) => i !== index) }));
  };

  return (
    <div className="submission-form-page" style={{ maxWidth: 840, margin: "0 auto" }}>
      <PageTitle
        eyebrow="Knowledge Contribution"
        title={isKnowledge ? "Add Knowledge Post" : "Submit Knowledge"}
        subtitle={
          isKnowledge
            ? "Share reusable documentation, guides, or operational solutions across ABM teams."
            : "Submit a workflow walkthrough, bug solution, or task knowledge for peer and admin review."
        }
      />

      <form onSubmit={submit} className="table-card" style={{ padding: "28px 32px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Title */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              placeholder={isKnowledge ? "e.g., Guide to API Rate Limiting & Architecture" : "e.g., Resolving Database Deadlocks in Postgres"}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 9,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                outline: "none",
                background: "#ffffff"
              }}
            />
          </div>

          {/* Department & Category Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                <Building2 size={14} style={{ color: "#2563eb" }} /> Department <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 9,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  background: "#ffffff"
                }}
              >
                {(data.departments || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                <Folder size={14} style={{ color: "#2563eb" }} /> Category <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 9,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  background: "#ffffff"
                }}
              >
                {(data.categories || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags (Only for Create Knowledge Post) */}
          {mode === "knowledge" && (
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                <Tag size={14} style={{ color: "#2563eb" }} /> Tags (comma-separated)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="e.g. backend, database, docker, performance"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 9,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  background: "#ffffff"
                }}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Description & Knowledge Content <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
              rows={6}
              placeholder="Provide clear steps, root cause explanations, code examples, or helpful context..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 9,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                outline: "none",
                background: "#ffffff",
                resize: "vertical",
                lineHeight: 1.6
              }}
            />
          </div>

          {/* Attachments Dropzone */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Supporting Attachments (Optional)
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 20px",
                border: "2px dashed #cbd5e1",
                borderRadius: 12,
                background: "#f8fafc",
                cursor: "pointer",
                textAlign: "center",
                transition: "border-color 0.15s ease"
              }}
            >
              <UploadCloud size={36} style={{ color: "#2563eb", marginBottom: 8 }} />
              <strong style={{ fontSize: 14, color: "#1e293b" }}>Click or drag files here to attach</strong>
              <span style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Supports DOCX, PDF, TXT, PNG, JPG, MP4, WebM, MOV up to 500MB
              </span>
              <input
                type="file"
                accept=".docx,.pdf,.txt,.png,.jpg,.jpeg,.mp4,.webm,.mov"
                multiple
                onChange={addFiles}
                style={{ display: "none" }}
              />
            </label>

            {form.files.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {form.files.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
                      <File size={14} style={{ color: "#2563eb" }} />
                      <strong>{file.name}</strong>
                      <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2 }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              type="button"
              className="secondary"
              onClick={() => setRoute(isKnowledge ? "knowledge-feed" : "tasks")}
              style={{ padding: "8px 18px", fontSize: 13.5, fontWeight: 600, borderRadius: 8 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={submitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 20px",
                fontSize: 13.5,
                fontWeight: 700,
                borderRadius: 8
              }}
            >
              <Send size={15} />
              {submitting ? "Submitting..." : isKnowledge ? "Publish Knowledge" : "Submit for Review"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
