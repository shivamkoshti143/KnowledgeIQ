import { useState } from "react";
import { Settings, Image, Save, Building2, ShieldCheck, Check } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";

export function SiteSettings({ data, onSaved, setToast }) {
  const settings = data.siteSettings || {};
  const [form, setForm] = useState({
    portalName: settings.portalName || "TaskIQ",
    logoUrl: settings.logoUrl || "",
    faviconUrl: settings.faviconUrl || "",
    restrictByDepartment: Boolean(Number(settings.restrictByDepartment)),
    logoFile: null,
    faviconFile: null
  });
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const body = new FormData();
      body.append("portalName", form.portalName);
      body.append("restrictByDepartment", form.restrictByDepartment ? "1" : "0");
      if (form.logoFile) body.append("logo", form.logoFile);
      if (form.faviconFile) body.append("favicon", form.faviconFile);

      await request("/site-settings", { method: "POST", body });
      await onSaved();
      setToast("Site settings saved successfully.");
    } catch (err) {
      setToast(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="site-settings-page" style={{ maxWidth: 760, margin: "0 auto" }}>
      <PageTitle
        eyebrow="System Configuration"
        title="Site Settings & Branding"
        subtitle="Customize portal name, brand logo, favicon, and department access rules."
      />

      <form onSubmit={submit} className="table-card" style={{ padding: "28px 32px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Department Content Restriction Setting */}
          <div
            style={{
              padding: "20px 22px",
              borderRadius: 14,
              background: form.restrictByDepartment ? "rgba(22, 163, 74, 0.04)" : "#f8fafc",
              border: `1.5px solid ${form.restrictByDepartment ? "rgba(22, 163, 74, 0.3)" : "#e2e8f0"}`,
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: form.restrictByDepartment ? "rgba(22, 163, 74, 0.15)" : "rgba(100, 116, 139, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: form.restrictByDepartment ? "#16a34a" : "#64748b"
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                    Department Content Restriction
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: form.restrictByDepartment ? "#dcfce7" : "#f1f5f9",
                      color: form.restrictByDepartment ? "#15803d" : "#64748b",
                      border: `1px solid ${form.restrictByDepartment ? "#bbf7d0" : "#e2e8f0"}`
                    }}
                  >
                    {form.restrictByDepartment ? "RESTRICTION ENABLED" : "RESTRICTION DISABLED"}
                  </span>
                </div>

                <p style={{ fontSize: 13.5, color: "#475569", margin: "0 0 8px 0", lineHeight: 1.55 }}>
                  {form.restrictByDepartment ? (
                    <span>
                      <strong style={{ color: "#15803d" }}>Active:</strong> Standard users and employees can <strong>only see</strong> knowledge posts and tasks belonging to their own department.
                    </span>
                  ) : (
                    <span>
                      <strong style={{ color: "#475569" }}>Inactive:</strong> Standard users and employees can browse and view knowledge posts and tasks from <strong>all departments</strong>.
                    </span>
                  )}
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
                  <ShieldCheck size={14} style={{ color: "#64748b" }} />
                  <span>Administrators always retain full access to content across all departments regardless of this setting.</span>
                </div>
              </div>

              {/* Custom Toggle Switch */}
              <div style={{ paddingTop: 4 }}>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: 52,
                    height: 28,
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                  title={form.restrictByDepartment ? "Click to disable restriction" : "Click to enable restriction"}
                >
                  <input
                    type="checkbox"
                    checked={form.restrictByDepartment}
                    onChange={(e) => setForm({ ...form, restrictByDepartment: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: form.restrictByDepartment ? "#16a34a" : "#cbd5e1",
                      borderRadius: 30,
                      transition: "0.25s ease",
                      boxShadow: form.restrictByDepartment ? "0 0 0 2px rgba(22, 163, 74, 0.2)" : "none"
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        height: 22,
                        width: 22,
                        left: form.restrictByDepartment ? 27 : 3,
                        bottom: 3,
                        backgroundColor: "#ffffff",
                        borderRadius: "50%",
                        transition: "0.25s ease",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Portal Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={form.portalName}
              onChange={(event) => setForm({ ...form, portalName: event.target.value })}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                outline: "none",
                background: "#ffffff"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Logo Upload */}
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
                <Image size={15} style={{ color: "#2563eb" }} /> Portal Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setForm({ ...form, logoFile: event.target.files[0] })}
                style={{ fontSize: 12, width: "100%" }}
              />
              {form.logoUrl && !form.logoFile && (
                <div style={{ marginTop: 12, padding: 8, background: "#ffffff", borderRadius: 8, border: "1px solid #cbd5e1", display: "inline-block" }}>
                  <img src={form.logoUrl} alt="Portal Logo" style={{ maxHeight: 48, objectFit: "contain", display: "block" }} />
                </div>
              )}
            </div>

            {/* Favicon Upload */}
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
                <Image size={15} style={{ color: "#2563eb" }} /> Favicon
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setForm({ ...form, faviconFile: event.target.files[0] })}
                style={{ fontSize: 12, width: "100%" }}
              />
              {form.faviconUrl && !form.faviconFile && (
                <div style={{ marginTop: 12, padding: 8, background: "#ffffff", borderRadius: 8, border: "1px solid #cbd5e1", display: "inline-block" }}>
                  <img src={form.faviconUrl} alt="Favicon" style={{ maxHeight: 32, objectFit: "contain", display: "block" }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              type="submit"
              className="primary"
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", fontSize: 13.5, fontWeight: 700, borderRadius: 8 }}
            >
              <Save size={15} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
