import { useEffect, useState } from "react";
import { UserCheck, Shield, Check, X, Search, AlertCircle } from "lucide-react";
import { request } from "../api/client";
import { PageTitle, EmptyState } from "../components/UI";
import { getInitials } from "../utils/initials";

export function RoleAssign({ setToast, onChange }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Allocation Form State
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [assignmentsData, rolesData] = await Promise.all([
        request("/admin/role-assignments"),
        request("/admin/roles")
      ]);
      setUsers(Array.isArray(assignmentsData) ? assignmentsData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (err) {
      setError(err.message || "Failed to load role assignments.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignRole(userId, roleId) {
    setError("");
    setSaving(true);
    try {
      const res = await request("/admin/role-assignments", {
        method: "POST",
        body: JSON.stringify({ userId, roleId: roleId || null })
      });

      if (res.user) {
        setUsers((prev) =>
          prev.map((u) => (u.id === res.user.id ? { ...u, ...res.user } : u))
        );
      } else {
        await loadData();
      }

      if (setToast) {
        setToast(res.message || "Role allocated successfully.");
      }
      await onChange?.();

      // Reset form if from top form
      if (selectedUserId === String(userId)) {
        setSelectedUserId("");
        setSelectedRoleId("");
      }
    } catch (err) {
      setError(err.message || "Failed to assign role.");
    } finally {
      setSaving(false);
    }
  }

  const selectedRoleObj = roles.find((r) => String(r.id) === String(selectedRoleId));

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.custom_role_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="role-assign-page">
      <PageTitle
        title="Role Assign"
        subtitle="Allocate custom created roles and their permissions to users."
      />

      {error && (
        <div className="alert-box error" style={{ marginBottom: 18 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Role Allocation Form Card */}
      <div className="table-card" style={{ marginBottom: 24, padding: 24 }}>
        <div className="section-heading" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <UserCheck size={20} className="text-primary" /> Allocate Role to User
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Select a user and allocate a custom role to grant them specific access permissions.
          </p>
        </div>

        {roles.length === 0 ? (
          <div
            style={{
              padding: "16px 20px",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: 10,
              color: "#b45309",
              fontSize: 13.5
            }}
          >
            <strong>No custom roles found.</strong> Please create roles first under{" "}
            <strong>Role Management</strong> before allocating them to users.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedUserId) {
                setError("Please select a user.");
                return;
              }
              handleAssignRole(selectedUserId, selectedRoleId);
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
              {/* Select User */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
                  Select User <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    if (error) setError("");
                    // Pre-fill role of selected user
                    const userObj = users.find((u) => String(u.id) === e.target.value);
                    if (userObj && userObj.role_id) {
                      setSelectedRoleId(String(userObj.role_id));
                    } else {
                      setSelectedRoleId("");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color, #cbd5e1)",
                    fontSize: 14,
                    outline: "none"
                  }}
                  required
                >
                  <option value="">-- Choose User --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) {u.custom_role_name ? `[${u.custom_role_name}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Role */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
                  Select Role <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => {
                    setSelectedRoleId(e.target.value);
                    if (error) setError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color, #cbd5e1)",
                    fontSize: 14,
                    outline: "none"
                  }}
                >
                  <option value="">-- None / Remove Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_name || r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Role Permission Preview */}
            {selectedRoleObj && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "12px 16px",
                  background: "rgba(37, 99, 235, 0.04)",
                  border: "1px solid rgba(37, 99, 235, 0.15)",
                  borderRadius: 8
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--primary, #1d4ed8)", marginBottom: 6 }}>
                  Permissions included in "{selectedRoleObj.role_name || selectedRoleObj.name}":
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedRoleObj.attached_permissions ? (
                    selectedRoleObj.attached_permissions.split(", ").map((permName, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "#ffffff",
                          color: "var(--primary, #1d4ed8)",
                          border: "1px solid rgba(37, 99, 235, 0.2)",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500
                        }}
                      >
                        {permName}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No permissions configured</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="primary"
                disabled={saving || !selectedUserId}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8
                }}
              >
                {saving ? "Saving..." : "Assign Role"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Users & Role Allocation Table Card */}
      <div className="table-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>User Role Allocations</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              Overview of all users and their currently allocated custom roles.
            </p>
          </div>

          <div style={{ position: "relative", minWidth: 240 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search user or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: 8,
                border: "1px solid var(--border-color, #cbd5e1)",
                fontSize: 13,
                outline: "none"
              }}
            />
          </div>
        </div>

        {users.length === 0 ? (
          <EmptyState title="No users found." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(0, 0, 0, 0.08)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--text-secondary)", width: "28%" }}>User</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--text-secondary)", width: "25%" }}>Allocated Role</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--text-secondary)" }}>Attached Permissions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.05)" }}>
                    {/* User Info */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 14,
                            flexShrink: 0
                          }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{user.name}</div>
                          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Allocated Role Dropdown */}
                    <td style={{ padding: "14px 16px" }}>
                      <select
                        value={user.role_id || ""}
                        onChange={(e) => handleAssignRole(user.id, e.target.value)}
                        disabled={saving}
                        style={{
                          width: "100%",
                          maxWidth: 200,
                          padding: "6px 10px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: user.role_id ? 600 : 400,
                          color: user.role_id ? "var(--primary, #1d4ed8)" : "var(--text-muted)",
                          border: user.role_id ? "1px solid rgba(37, 99, 235, 0.3)" : "1px solid #cbd5e1",
                          background: user.role_id ? "rgba(37, 99, 235, 0.05)" : "#fff",
                          cursor: "pointer",
                          outline: "none"
                        }}
                      >
                        <option value="">None / Unassigned</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.role_name || r.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Attached Permissions */}
                    <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>
                      {user.attached_permissions ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {user.attached_permissions.split(", ").map((permName, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: "inline-block",
                                background: "rgba(37, 99, 235, 0.06)",
                                color: "var(--primary, #1d4ed8)",
                                border: "1px solid rgba(37, 99, 235, 0.16)",
                                padding: "2px 7px",
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 500
                              }}
                            >
                              {permName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 12.5 }}>
                          No custom permissions
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
