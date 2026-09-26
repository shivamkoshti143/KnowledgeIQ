import { useState } from "react";
import { Settings, Image, Save } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";

export function SiteSettings({ data, onSaved, setToast }) {
  const settings = data.siteSettings || {};
  const [form, setForm] = useState({
    portalName: settings.portalName || "TaskIQ",
    logoUrl: settings.logoUrl || "",
    faviconUrl: settings.faviconUrl || "",
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
        subtitle="Customize portal name, brand logo, and favicon."
      />

      <form onSubmit={submit} className="table-card" style={{ padding: "28px 32px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
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
