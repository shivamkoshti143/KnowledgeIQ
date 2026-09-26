import { useEffect, useState } from "react";
import { BookOpen, MessageCircle, Play, ShieldCheck, Mail, User, Building2, KeyRound, ArrowRight } from "lucide-react";
import { request } from "../api/client";
import { AuthError, AuthLoadingState } from "../components/AuthFeedback";

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [departments, setDepartments] = useState([]);
  const [siteSettings, setSiteSettings] = useState({ portalName: "TaskIQ", logoUrl: "", faviconUrl: "" });
  const [form, setForm] = useState({ email: "", name: "", departmentId: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Fetch site settings & departments
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
      .catch(() => { });

    // 2. Handle Microsoft OAuth callback redirect (token or error in query/hash)
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ""));
    const authToken = searchParams.get("auth_token") || hashParams.get("auth_token") || searchParams.get("token") || hashParams.get("token");
    const authError = searchParams.get("error") || hashParams.get("error");

    if (authError) {
      setError(decodeURIComponent(authError));
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (_) { }
    } else if (authToken) {
      setAuthenticating(true);
      setAuthMessage("Signing you in with Microsoft...");

      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to verify user session");
          return res.json();
        })
        .then((userData) => {
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (_) { }
          onAuth(userData, authToken);
        })
        .catch((err) => {
          setError(err.message || "Failed to complete Microsoft sign-in.");
          setAuthenticating(false);
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (_) { }
        });
    }
  }, [onAuth]);

  const portalName = siteSettings.portalName || "TaskIQ";
  const logoUrl = siteSettings.logoUrl || "";
  const isSignup = mode === "signup";

  function handleMicrosoftSignIn() {
    setLoading(true);
    setAuthenticating(true);
    setAuthMessage("Redirecting to Microsoft Entra ID...");
    window.location.href = "/api/auth/microsoft";
  }

  async function handleManualSubmit(event) {
    if (event?.preventDefault) event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const targetEmail = form.email.toLowerCase().trim();

      if (isSignup) {
        if (!form.name.trim()) throw new Error("Full name is required.");
        if (form.password !== form.confirmPassword) throw new Error("Passwords do not match.");
        if (form.password.length < 8) throw new Error("Password must be at least 8 characters.");

        const payload = {
          name: form.name.trim(),
          email: targetEmail,
          password: form.password,
          departmentId: form.departmentId ? parseInt(form.departmentId) : null,
          title: "Employee"
        };

        const result = await request("/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (result.success && result.token && result.user) {
          onAuth(result.user, result.token);
        } else {
          setError(result.message || "Registration succeeded, but login failed.");
        }
      } else {
        // Manual login
        const payload = {
          email: targetEmail,
          password: form.password
        };

        const result = await request("/auth/login", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (result.success && result.token && result.user) {
          onAuth(result.user, result.token);
        } else {
          setError(result.message || "Login failed. Please try again.");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError("");
    setForm({ email: "", name: "", departmentId: "", password: "", confirmPassword: "" });
  }

  return (
    <main className="auth-screen" style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left hero banner */}
      <section className="auth-copy" style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 40px",
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
        color: "#fff",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 520 }}>
          <div className="brand brand-light" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="brand-logo" style={{ height: 48, maxWidth: 130, width: "auto", objectFit: "contain" }} />
            ) : (
              <span className="brand-placeholder" style={{ width: 44, height: 44, fontSize: 16, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>KP</span>
            )}
            <span className="brand-title" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{portalName}</span>
          </div>
          <span className="eyebrow" style={{ color: "#93c5fd", fontWeight: 700, letterSpacing: "0.08em", fontSize: 12.5, textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            ABM ENTERPRISE PORTAL
          </span>
          <h1 style={{ fontSize: "clamp(30px, 2.6vw, 38px)", fontWeight: 800, lineHeight: 1.22, margin: "0 0 14px", maxWidth: 620, letterSpacing: "-0.03em" }}>
            Modern task guidance and reusable knowledge, built for daily work.
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, opacity: 0.9, maxWidth: 530, margin: "0 0 28px" }}>
            Sign in with your Microsoft 365 / Entra ID work account for seamless access to tasks, documents, and approved workflows.
          </p>
          <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(200px, 1fr))", gap: 12, maxWidth: 600 }}>
            <MiniFeature icon={<BookOpen size={19} />} text="Centralized knowledge library" />
            <MiniFeature icon={<Play size={19} />} text="Video-first learning journeys" />
            <MiniFeature icon={<MessageCircle size={19} />} text="Discussion around every resource" />
            <MiniFeature icon={<ShieldCheck size={19} />} text="Microsoft Entra ID Single Sign-On" />
          </div>
        </div>
      </section>

      {/* Right authentication form */}
      <div
        className="auth-card-container"
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "auto",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: "100vh"
        }}
      >
        <div
          className="auth-card"
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "36px 32px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0"
          }}
        >
          {authenticating ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <AuthLoadingState message={authMessage || "Verifying credentials..."} />
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 6px", textAlign: "center" }}>
                {isSignup ? "Create your account" : "Welcome to TaskIQ"}
              </h2>
              <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 24px", textAlign: "center" }}>
                {isSignup
                  ? "Register using your company email address"
                  : "Sign in with Microsoft or use your email and password"}
              </p>

              {/* Primary Microsoft Authentication Button */}
              {!isSignup && (
                <div style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    className="microsoft-btn"
                    onClick={handleMicrosoftSignIn}
                    disabled={loading || authenticating}
                    style={{
                      width: "100%",
                      padding: "12px 18px",
                      borderRadius: 10,
                      border: "1.5px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: 14.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      transition: "all 0.15s ease",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.03)"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "#94a3b8";
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.06)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.03)";
                    }}
                  >
                    <MicrosoftIcon />
                    <span>Continue with Microsoft</span>
                  </button>

                  <div style={{ display: "flex", alignItems: "center", margin: "22px 0 18px", gap: 12 }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      or
                    </span>
                    <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                  </div>
                </div>
              )}

              {/* Manual Email + Password Form */}
              <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {isSignup && (
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                      <User size={14} style={{ color: "#2563eb" }} /> Full Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="e.g. Shivam Koshti"
                      required
                      disabled={loading}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    <Mail size={14} style={{ color: "#2563eb" }} /> Company Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="name@abmindia.com"
                    required
                    disabled={loading}
                    autoComplete={isSignup ? "email" : "username"}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                    <KeyRound size={14} style={{ color: "#2563eb" }} /> Password
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder={isSignup ? "Minimum 8 characters" : "Enter password"}
                    required
                    disabled={loading}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {isSignup && (
                  <>
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                        <KeyRound size={14} style={{ color: "#2563eb" }} /> Confirm Password
                      </label>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                        placeholder="Re-enter password"
                        required
                        disabled={loading}
                        autoComplete="new-password"
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      />
                    </div>

                    {departments.length > 0 && (
                      <div>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                          <Building2 size={14} style={{ color: "#2563eb" }} /> Department
                        </label>
                        <select
                          value={form.departmentId}
                          onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                          disabled={loading}
                          style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                        >
                          <option value="">Select department (optional)</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                      <p style={{ fontSize: 12, color: "#dc2626", margin: "2px 0 0" }}>Passwords do not match</p>
                    )}
                  </>
                )}

                <button
                  className="primary"
                  type="submit"
                  disabled={loading || (isSignup && form.password !== form.confirmPassword)}
                  style={{
                    marginTop: 6,
                    padding: "11px 16px",
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 9,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    cursor: "pointer",
                    opacity: loading || (isSignup && form.password !== form.confirmPassword) ? 0.6 : 1
                  }}
                >
                  {loading
                    ? (isSignup ? "Creating account..." : "Signing in...")
                    : (isSignup ? "Create Account" : "Login")}
                  <ArrowRight size={15} />
                </button>
              </form>

              {error && (
                <div style={{ marginTop: 16 }}>
                  <AuthError message={error} onDismiss={() => setError("")} />
                </div>
              )}

              <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
                <button
                  className="link-button"
                  type="button"
                  onClick={() => switchMode(isSignup ? "login" : "signup")}
                  disabled={loading}
                  style={{
                    fontSize: 13.5,
                    color: "#2563eb",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {isSignup ? "Already have an account? Sign in" : "Don't have an account? Register"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
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
        fontSize: 13.5,
        fontWeight: 600
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", color: "#93c5fd", flexShrink: 0 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}