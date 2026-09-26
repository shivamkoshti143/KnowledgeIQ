import { useEffect, useState } from "react";
import { BookOpen, MessageCircle, Play, ShieldCheck } from "lucide-react";
import { request } from "../api/client";

export function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [departments, setDepartments] = useState([]);
  const [siteSettings, setSiteSettings] = useState({ portalName: "ABM TaskIQ", logoUrl: "", faviconUrl: "" });
  const [form, setForm] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@abm.com", password: "admin123" })
    })
      .then((response) => response.json())
      .then(({ token }) => {
        localStorage.setItem("taskiq-token", token);
        return request("/bootstrap");
      })
      .then((bootstrap) => {
        localStorage.removeItem("taskiq-token");
        setDepartments(bootstrap.departments || []);
        setSiteSettings(bootstrap.siteSettings || { portalName: "ABM TaskIQ", logoUrl: "", faviconUrl: "" });
      })
      .catch(() => { });
  }, []);

  const portalName = siteSettings.portalName || "ABM TaskIQ";
  const logoUrl = siteSettings.logoUrl || "";

  async function submit(event) {
    event.preventDefault();
    setError("");

    try {
      const payload = await request(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      onAuth(payload.user, payload.token);
    } catch (err) {
      setError(err.message);
    }
  }

  function quickLogin(role) {
    const next = role === "admin"
      ? { email: "admin@abm.com", password: "admin123" }
      : { email: "karthik@abm.com", password: "password123" };
    setForm((current) => ({ ...current, ...next }));
  }

  return (
    <main className="auth-screen">
      <section className="auth-copy">
        <div className="brand brand-light">{logoUrl ? <img src={logoUrl} alt="Logo" className="brand-logo" /> : <span>KP</span>} {portalName}</div>
        <span className="eyebrow">ABM Learning Experience</span>
        <h1>Modern task guidance and reusable knowledge, built for daily work.</h1>
        <p>Browse approved walkthroughs, share operational know-how, and keep team learning moving without scattered documents.</p>
        <div className="feature-grid">
          <MiniFeature icon={<BookOpen />} text="Centralized knowledge library" />
          <MiniFeature icon={<Play />} text="Video-first learning journeys" />
          <MiniFeature icon={<MessageCircle />} text="Discussion around every resource" />
          <MiniFeature icon={<ShieldCheck />} text="Reviewed and approved content" />
        </div>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === "login" ? "Sign in to the portal" : "Create your workspace access"}</h2>
        <p>{mode === "login" ? "Use your ABM account to continue." : "Register with your company email and department."}</p>
        {mode === "signup" && (
          <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        )}
        <label>Email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
        {mode === "signup" && (
          <label>Department
            <select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit">{mode === "login" ? "Login" : "Sign Up"}</button>
        <div className="auth-actions">
          <button type="button" onClick={() => quickLogin("employee")}>Employee Demo</button>
          <button type="button" onClick={() => quickLogin("admin")}>Admin Demo</button>
        </div>
        <button className="link-button" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Create an account" : "Already have an account?"}
        </button>
      </form>
    </main>
  );
}

function MiniFeature({ icon, text }) {
  return <div className="mini-feature">{icon}<span>{text}</span></div>;
}
