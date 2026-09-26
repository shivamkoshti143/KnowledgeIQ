import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";

export function SiteSettings({ data, onSaved, setToast }) {
  const settings = data.siteSettings || {};
  const [form, setForm] = useState({
    portalName: settings.portalName || "ABM TaskIQ",
    logoUrl: settings.logoUrl || "",
    faviconUrl: settings.faviconUrl || "",
    logoFile: null,
    faviconFile: null
  });

  async function submit(event) {
    event.preventDefault();
    const body = new FormData();
    body.append("portalName", form.portalName);
    if (form.logoFile) body.append("logo", form.logoFile);
    if (form.faviconFile) body.append("favicon", form.faviconFile);

    await request("/site-settings", { method: "POST", body });
    await onSaved();
    setToast("Site settings saved.");
  }

  return (
    <>
      <PageTitle title="Site Settings" subtitle="Customize portal branding." />
      <form className="upload-layout" onSubmit={submit}>
        <div className="form-panel">
          <label>Portal Name<input value={form.portalName} onChange={(event) => setForm({ ...form, portalName: event.target.value })} required /></label>
          <div className="form-actions">
            <button className="primary" type="submit">Save Settings</button>
          </div>
        </div>
        <div className="form-panel">
          <label>Logo
            <input type="file" accept="image/*" onChange={(event) => setForm({ ...form, logoFile: event.target.files[0] })} />
          </label>
          {form.logoUrl && !form.logoFile && <img src={form.logoUrl} alt="Logo" style={{ maxHeight: 80, marginTop: 8 }} />}
          <label>Favicon
            <input type="file" accept="image/*" onChange={(event) => setForm({ ...form, faviconFile: event.target.files[0] })} />
          </label>
          {form.faviconUrl && !form.faviconFile && <img src={form.faviconUrl} alt="Favicon" style={{ maxHeight: 40, marginTop: 8 }} />}
        </div>
      </form>
    </>
  );
}
