import { useState } from "react";
import { Search, UserCheck, UserX, X, Clock } from "lucide-react";
import { request } from "../api/client";
import { PageTitle, EmptyState } from "../components/UI";
import { getInitials } from "../utils/initials";

function formatLastActive(dateString) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Never";

  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return `${date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function ManageUsers({ data, onChange, setToast }) {
  const [searchTerm, setSearchTerm] = useState("");
  const users = data.users || [];

  async function updateUser(user, patch) {
    try {
      await request(`/users/${user.id}`, { method: "PUT", body: JSON.stringify(patch) });
      await onChange();
      if (setToast && patch.status) {
        setToast(`User "${user.name}" marked as ${patch.status}.`);
      }
    } catch (err) {
      if (setToast) {
        setToast(err.message || "Failed to update user.");
      }
    }
  }

  // Filter users by search term
  const query = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!query) return true;
    const name = (user.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const role = (user.role || "").toLowerCase();
    const deptName = (
      data.departments?.find((d) => d.id === user.departmentId || d.id === user.department_id)?.name || ""
    ).toLowerCase();
    return name.includes(query) || email.includes(query) || role.includes(query) || deptName.includes(query);
  });

  const activeUsers = filteredUsers.filter((u) => u.status !== "inactive");
  const inactiveUsers = filteredUsers.filter((u) => u.status === "inactive");

  const totalActive = users.filter((u) => u.status !== "inactive").length;
  const totalInactive = users.filter((u) => u.status === "inactive").length;

  function renderUserRow(user) {
    const isInactive = user.status === "inactive";
    const departmentName = data.departments?.find(
      (d) => d.id === user.departmentId || d.id === user.department_id
    )?.name;
    const lastActiveTime = user.lastActive || user.last_active_at || user.createdAt;

    return (
      <div
        key={user.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: isInactive ? "#fafafa" : "#ffffff",
          border: isInactive ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(0, 0, 0, 0.08)",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
          transition: "all 0.15s ease",
          gap: 16,
          flexWrap: "wrap"
        }}
      >
        {/* Left: Avatar + User Info + Last Active */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 260, flex: 1 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: isInactive
                ? "linear-gradient(135deg, #94a3b8, #64748b)"
                : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0
            }}
          >
            {getInitials(user.name)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 14.5, color: isInactive ? "#475569" : "var(--text-primary, #0f172a)" }}>
                {user.name}
              </span>
              {user.role === "admin" && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #bfdbfe"
                  }}
                >
                  Admin
                </span>
              )}
              {user.role !== "admin" && departmentName && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    color: "#64748b"
                  }}
                >
                  {departmentName}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
              {user.email}
            </div>
            {/* Last Active Timestamp */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b", marginTop: 4 }}>
              <Clock size={13} style={{ color: isInactive ? "#94a3b8" : "#3b82f6" }} />
              <span>
                Last active: <strong style={{ color: isInactive ? "#64748b" : "#1e293b", fontWeight: 600 }}>{formatLastActive(lastActiveTime)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Department & Status Selectors */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {user.role !== "admin" && (
            <select
              value={user.departmentId || user.department_id || ""}
              onChange={(event) => updateUser(user, { departmentId: event.target.value ? Number(event.target.value) : null })}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#ffffff",
                color: "#334155"
              }}
            >
              <option value="">No Department</option>
              {(data.departments || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={user.status || "active"}
            onChange={(event) => updateUser(user, { status: event.target.value })}
            style={{
              width: 110,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
              border: isInactive ? "1px solid #fca5a5" : "1px solid #86efac",
              background: isInactive ? "#fef2f2" : "#f0fdf4",
              color: isInactive ? "#dc2626" : "#16a34a"
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-users-page">
      <PageTitle
        eyebrow="User Management"
        title="Users"
        subtitle={`Manage user accounts and active/inactive status across ${users.length} total registered users.`}
        actions={
          <div style={{ position: "relative", width: 280, maxWidth: "100%" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none"
              }}
            />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 34px 9px 36px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.9)",
                background: "rgba(255, 255, 255, 0.95)",
                fontSize: 13.5,
                outline: "none",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
                boxSizing: "border-box"
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        }
      />

      {/* Active Users Section */}
      <div className="table-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Active Users
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                {activeUsers.length} {searchTerm ? `matching (out of ${totalActive})` : "active accounts"}
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              background: "#f0fdf4",
              color: "#16a34a",
              border: "1px solid #bbf7d0"
            }}
          >
            {activeUsers.length} Active
          </span>
        </div>

        {activeUsers.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeUsers.map(renderUserRow)}
          </div>
        ) : (
          <EmptyState title={searchTerm ? "No active users match your search" : "No active users found"} />
        )}
      </div>

      {/* Inactive Users Section */}
      <div className="table-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <UserX size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Inactive Users
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-muted)" }}>
                {inactiveUsers.length} {searchTerm ? `matching (out of ${totalInactive})` : "disabled accounts"}
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca"
            }}
          >
            {inactiveUsers.length} Inactive
          </span>
        </div>

        {inactiveUsers.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inactiveUsers.map(renderUserRow)}
          </div>
        ) : (
          <EmptyState title={searchTerm ? "No inactive users match your search" : "No inactive users"} />
        )}
      </div>
    </div>
  );
}
