import { useState } from "react";
import { UploadCloud, Video, Building2, Folder, Tag, Send, File } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";

export function UploadPage({ data, onUploaded, setToast }) {
  const [form, setForm] = useState({
    title: "",
    departmentId: data.departments?.[0]?.id || "",
    categoryId: data.categories?.[0]?.id || "",
    tags: "",
    description: "",
    file: null
  });
  const [uploading, setUploading] = useState(false);

  async function submit(event, draft = false) {
    event.preventDefault();
    if (!form.title.trim()) {
      setToast("Please enter a title.");
      return;
    }
    if (!form.file && !draft) {
      setToast("Please select a video file to upload.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          body.append(key, value);
        }
      });
      body.append("saveAsDraft", String(draft));

      await request("/videos", { method: "POST", body });
      setForm({
        title: "",
        departmentId: data.departments?.[0]?.id || "",
        categoryId: data.categories?.[0]?.id || "",
        tags: "",
        description: "",
        file: null
      });
      await onUploaded();
      setToast(draft ? "Draft saved." : "Knowledge is sent for review.");
    } catch (err) {
      setToast(err.message || "Failed to upload video.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="upload-video-page" style={{ maxWidth: 840, margin: "0 auto" }}>
      <PageTitle
        eyebrow="Video Library"
        title="Upload Video Guide"
        subtitle="Share high-impact visual walkthroughs and recorded procedures for team learning."
      />

      <form onSubmit={(e) => submit(e, false)} className="table-card" style={{ padding: "28px 32px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Title */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Video Title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="e.g. End-to-End Microservice Deployment Walkthrough"
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

          {/* Department & Category */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                <Building2 size={14} style={{ color: "#0ea5e9" }} /> Department <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
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
                <Folder size={14} style={{ color: "#0ea5e9" }} /> Category <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
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

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Description & Video Notes <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={5}
              placeholder="Describe what is covered in this video walkthrough..."
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

          {/* Video Dropzone */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Video File <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "26px 20px",
                border: "2px dashed #cbd5e1",
                borderRadius: 12,
                background: "#f8fafc",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              <Video size={36} style={{ color: "#0ea5e9", marginBottom: 8 }} />
              <strong style={{ fontSize: 14, color: "#1e293b" }}>
                {form.file ? form.file.name : "Click or drag video file here"}
              </strong>
              <span style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Supports MP4, WebM, MOV up to 500MB
              </span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              type="button"
              className="secondary"
              onClick={(e) => submit(e, true)}
              disabled={uploading}
              style={{ padding: "8px 18px", fontSize: 13.5, fontWeight: 600, borderRadius: 8 }}
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="primary"
              disabled={uploading}
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
              {uploading ? "Uploading..." : "Submit for Approval"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
