import { useEffect, useState } from "react";
import { BookOpen, MessageCircle, Play, ShieldCheck, Mail, User, Building2, KeyRound, ArrowRight } from "lucide-react";
import { request } from "../api/client";

export function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("input");
  const [departments, setDepartments] = useState([]);
  const [siteSettings, setSiteSettings] = useState({ portalName: "TaskIQ", logoUrl: "", faviconUrl: "" });
  const [form, setForm] = useState({ email: "", name: "", departmentId: "" });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/departments").then((res) => res.json()),
      fetch("/api/site-settings").then((res) => res.json())
    ])
      .then(([depts, settings]) => {
        setDepartments(depts || []);
        const s = settings || { portalName: "TaskIQ", logoUrl: "", faviconUrl: "" };
        setSiteSettings(s);
        if (s.portalName) document.title = s.portalName;
        const faviconUrl = s.faviconUrl || "/favicon.png";
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      })
      .catch(() => {});
  }, []);

  const portalName = siteSettings.portalName || "TaskIQ";
  const logoUrl = siteSettings.logoUrl || "";

  async function requestOtp(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload =
        mode === "signup"
          ? { name: form.name, email: form.email, departmentId: form.departmentId }
          : { email: form.email };

      await request(`/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
      setSentEmail(form.email);
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = { email: sentEmail, otp, mode };
      const result = await request("/auth/verify-otp", { method: "POST", body: JSON.stringify(payload) });
      onAuth(result.user, result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setStep("input");
    setOtp("");
    setError("");
    setSentEmail("");
  }

  return (
    <main className="auth-screen">
      <section className="auth-copy">
        <div className="brand brand-light" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="brand-logo" style={{ height: 48, maxWidth: 130, width: "auto", objectFit: "contain" }} />
          ) : (
            <span className="brand-placeholder" style={{ width: 44, height: 44, fontSize: 16, borderRadius: 10 }}>KP</span>
          )}
          <span className="brand-title" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{portalName}</span>
        </div>
        <span className="eyebrow" style={{ color: "#93c5fd", fontWeight: 700, letterSpacing: "0.08em", fontSize: 12.5, textTransform: "uppercase" }}>
          ABM LEARNING PORTAL
        </span>
        <h1 style={{ fontSize: "clamp(30px, 2.6vw, 38px)", fontWeight: 800, lineHeight: 1.22, margin: "10px 0 14px", maxWidth: 620, letterSpacing: "-0.03em" }}>
          Modern task guidance and reusable knowledge, built for daily work.
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, opacity: 0.9, maxWidth: 530, margin: "0 0 28px" }}>
          Browse approved walkthroughs, share operational know-how, and keep team learning moving without scattered documents.
        </p>
        <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(200px, 1fr))", gap: 12, maxWidth: 600 }}>
          <MiniFeature icon={<BookOpen size={19} />} text="Centralized knowledge library" />
          <MiniFeature icon={<Play size={19} />} text="Video-first learning journeys" />
          <MiniFeature icon={<MessageCircle size={19} />} text="Discussion around every resource" />
          <MiniFeature icon={<ShieldCheck size={19} />} text="Reviewed and approved content" />
        </div>
      </section>

      <form className="auth-card" onSubmit={step === "input" ? requestOtp : verifyOtp} style={{ borderRadius: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
          {mode === "login" ? "Sign in to the portal" : "Create your workspace account"}
        </h2>
        <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 20px" }}>
          {mode === "login" ? "Use your ABM account to continue." : "Register with your company email and department."}
        </p>

        {step === "input" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  <User size={14} style={{ color: "#2563eb" }} /> Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. John Doe"
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }}
                />
              </div>
            )}

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                <Mail size={14} style={{ color: "#2563eb" }} /> Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="name@abm.com"
                required
                style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }}
              />
            </div>

            {mode === "signup" && (
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  <Building2 size={14} style={{ color: "#2563eb" }} /> Department
                </label>
                <select
                  value={form.departmentId}
                  onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, outline: "none" }}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              className="primary"
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: "11px 16px",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 9,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              {loading ? "Sending..." : "Send OTP"} <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "10px 14px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", fontSize: 13, color: "#1e40af" }}>
              Enter the 6-digit code sent to <strong>{sentEmail}</strong>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                <KeyRound size={14} style={{ color: "#2563eb" }} /> One-Time Passcode (OTP)
              </label>
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="123456"
                maxLength={6}
                required
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 9,
                  border: "1px solid #cbd5e1",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  textAlign: "center",
                  outline: "none"
                }}
              />
            </div>

            <button
              className="primary"
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: "11px 16px",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 9,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <button
              type="button"
              className="link-button"
              onClick={() => {
                setStep("input");
                setError("");
              }}
              style={{ fontSize: 13, color: "#2563eb", cursor: "pointer", background: "none", border: "none" }}
            >
              ← Use a different email
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
          <button
            className="link-button"
            type="button"
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
            style={{ fontSize: 13.5, color: "#2563eb", fontWeight: 600, cursor: "pointer", background: "none", border: "none" }}
          >
            {mode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}

function MiniFeature({ icon, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 15px",
        borderRadius: 11,
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        color: "#ffffff",
        fontSize: 14,
        fontWeight: 600
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", color: "#93c5fd", flexShrink: 0 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
