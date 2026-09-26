import { useEffect, useState, useMemo, useRef } from "react";
import {
  ShieldCheck,
  Trash2,
  Edit3,
  X,
  Plus,
  Search,
  CheckCircle2,
  Layers,
  Sparkles,
  ChevronRight,
  CheckSquare,
  Square,
  AlertCircle,
  Settings2,
  UserCheck
} from "lucide-react";
import { request } from "../api/client";
import { PageTitle, EmptyState } from "../components/UI";

export function RoleManagement({ setToast, onChange }) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Section 1: Role Creation state
  const [newRoleName, setNewRoleName] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [editingNameRoleId, setEditingNameRoleId] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [roleSearch, setRoleSearch] = useState("");

  // Section 2: Permission Granting state
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedPermIds, setSelectedPermIds] = useState(new Set());
  const [savingPerms, setSavingPerms] = useState(false);
  const [permSearch, setPermSearch] = useState("");

  const permSectionRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [permsData, rolesData] = await Promise.all([
        request("/admin/permissions"),
        request("/admin/roles")
      ]);
      const loadedPerms = Array.isArray(permsData) ? permsData : [];
      const loadedRoles = Array.isArray(rolesData) ? rolesData : [];
      setPermissions(loadedPerms);
      setRoles(loadedRoles);

      // Auto-select first role for Section 2 if none is selected
      if (loadedRoles.length > 0) {
        setSelectedRoleId((prev) => {
          if (prev && loadedRoles.some((r) => r.id === prev)) return prev;
          const first = loadedRoles[0];
          setSelectedPermIds(new Set((first.permissions || []).map((p) => p.id)));
          return first.id;
        });
      }
    } catch (err) {
      setError(err.message || "Failed to load role management data.");
    } finally {
      setLoading(false);
    }
  }

  // When selected role changes in Section 2, populate its permissions
  function handleSelectRoleForPermissions(roleId) {
    const roleIdNum = Number(roleId);
    setSelectedRoleId(roleIdNum);
    const targetRole = roles.find((r) => r.id === roleIdNum);
    if (targetRole) {
      setSelectedPermIds(new Set((targetRole.permissions || []).map((p) => p.id)));
    } else {
      setSelectedPermIds(new Set());
    }
  }

  // Handle Section 1: Create Role
  async function handleCreateRole(e) {
    e.preventDefault();
    setError("");
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      setError("Please enter a role name.");
      return;
    }

    setCreatingRole(true);
    try {
      // Create role (default with employee permissions or empty)
      const employeeKeys = ["home", "tasks", "browse", "create-task", "knowledge-feed", "recommended", "bookmarks", "ai-assistant", "notifications"];
      const defaultEmpIds = permissions.filter((p) => employeeKeys.includes(p.permission_key)).map((p) => p.id);

      const res = await request("/admin/roles", {
        method: "POST",
        body: JSON.stringify({
          role_name: trimmed,
          permission_ids: defaultEmpIds
        })
      });

      const created = res.role;
      if (created) {
        setRoles((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
        setSelectedRoleId(created.id);
        setSelectedPermIds(new Set((created.permissions || []).map((p) => p.id)));
      } else {
        await loadData();
      }

      setNewRoleName("");
      if (setToast) setToast(`Role "${trimmed}" created successfully.`);
    } catch (err) {
      setError(err.message || "Failed to create role.");
    } finally {
      setCreatingRole(false);
    }
  }

  // Handle Section 1: Rename Role
  async function handleSaveRoleName(roleId) {
    const trimmed = editingNameValue.trim();
    if (!trimmed) return;

    try {
      const res = await request(`/admin/roles/${roleId}`, {
        method: "PUT",
        body: JSON.stringify({ role_name: trimmed })
      });

      if (res.role) {
        setRoles((prev) => prev.map((r) => (r.id === res.role.id ? { ...r, role_name: res.role.role_name, name: res.role.role_name } : r)));
      } else {
        await loadData();
      }

      setEditingNameRoleId(null);
      setEditingNameValue("");
      if (setToast) setToast(`Role renamed to "${trimmed}".`);
    } catch (err) {
      setError(err.message || "Failed to rename role.");
    }
  }

  // Handle Section 1: Delete Role
  async function handleDeleteRole(role) {
    const name = role.role_name || role.name;
    if (!window.confirm(`Are you sure you want to delete the role "${name}"?`)) return;

    try {
      await request(`/admin/roles/${role.id}`, { method: "DELETE" });
      const nextRoles = roles.filter((r) => r.id !== role.id);
      setRoles(nextRoles);

      if (selectedRoleId === role.id) {
        if (nextRoles.length > 0) {
          handleSelectRoleForPermissions(nextRoles[0].id);
        } else {
          setSelectedRoleId(null);
          setSelectedPermIds(new Set());
        }
      }

      if (setToast) setToast(`Role "${name}" deleted successfully.`);
    } catch (err) {
      setError(err.message || "Failed to delete role.");
    }
  }

  // Handle Section 2: Toggle permission hierarchy
  function togglePermission(permId) {
    const targetPerm = permissions.find((p) => p.id === permId);
    if (!targetPerm) return;

    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      const isCurrentlyChecked = next.has(permId);

      if (isCurrentlyChecked) {
        next.delete(permId);
        // If parent, uncheck children
        const children = permissions.filter((p) => p.parent_permission_id === permId);
        children.forEach((c) => next.delete(c.id));

        // If child, uncheck parent if no siblings checked
        if (targetPerm.parent_permission_id) {
          const siblings = permissions.filter(
            (p) => p.parent_permission_id === targetPerm.parent_permission_id && p.id !== permId
          );
          const hasAnySiblingChecked = siblings.some((s) => next.has(s.id));
          if (!hasAnySiblingChecked) {
            next.delete(targetPerm.parent_permission_id);
          }
        }
      } else {
        next.add(permId);
        // If parent, check all children
        const children = permissions.filter((p) => p.parent_permission_id === permId);
        children.forEach((c) => next.add(c.id));

        // If child, ensure parent is checked
        if (targetPerm.parent_permission_id) {
          next.add(targetPerm.parent_permission_id);
        }
      }
      return next;
    });
  }

  // Section 2: Quick Presets
  const EMPLOYEE_KEYS = useMemo(
    () => ["home", "tasks", "browse", "create-task", "knowledge-feed", "recommended", "bookmarks", "ai-assistant", "notifications"],
    []
  );

  function applyPreset(presetType) {
    if (presetType === "employee") {
      const ids = permissions.filter((p) => EMPLOYEE_KEYS.includes(p.permission_key)).map((p) => p.id);
      setSelectedPermIds(new Set(ids));
    } else if (presetType === "all") {
      const ids = permissions.map((p) => p.id);
      setSelectedPermIds(new Set(ids));
    } else if (presetType === "clear") {
      setSelectedPermIds(new Set());
    }
  }

  // Handle Section 2: Save Permissions
  async function handleSavePermissions() {
    if (!selectedRoleId) {
      setError("Please select a role to configure permissions for.");
      return;
    }

    setSavingPerms(true);
    setError("");

    try {
      const targetRole = roles.find((r) => r.id === selectedRoleId);
      const roleName = targetRole ? targetRole.role_name || targetRole.name : "";

      const res = await request(`/admin/roles/${selectedRoleId}`, {
        method: "PUT",
        body: JSON.stringify({
          role_name: roleName,
          permission_ids: Array.from(selectedPermIds)
        })
      });

      if (res.role) {
        setRoles((prev) => prev.map((r) => (r.id === res.role.id ? res.role : r)));
      } else {
        await loadData();
      }

      if (setToast) setToast(`Permissions updated for role "${roleName}".`);
      await onChange?.();
    } catch (err) {
      setError(err.message || "Failed to update permissions.");
    } finally {
      setSavingPerms(false);
    }
  }

  // Organize permissions
  const { generalPerms, elevatedTopPerms, childrenMap } = useMemo(() => {
    const cMap = {};
    for (const p of permissions) {
      if (p.parent_permission_id) {
        if (!cMap[p.parent_permission_id]) cMap[p.parent_permission_id] = [];
        cMap[p.parent_permission_id].push(p);
      }
    }

    const gen = permissions.filter((p) => !p.parent_permission_id && EMPLOYEE_KEYS.includes(p.permission_key));
    const ele = permissions.filter((p) => !p.parent_permission_id && !EMPLOYEE_KEYS.includes(p.permission_key));

    return { generalPerms: gen, elevatedTopPerms: ele, childrenMap: cMap };
  }, [permissions, EMPLOYEE_KEYS]);

  const activeRole = roles.find((r) => r.id === selectedRoleId);
  const pQuery = permSearch.trim().toLowerCase();

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => (r.role_name || r.name || "").toLowerCase().includes(q));
  }, [roles, roleSearch]);

  return (
    <div className="role-management-page">
      <PageTitle
        eyebrow="Access Control"
        title="Role Management"
        subtitle="Manage custom roles and configure granular feature permissions."
      />

      {error && (
        <div className="alert-box error" style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: ROLE CREATION & MANAGEMENT                                     */}
      {/* ========================================================================= */}
      <div className="table-card" style={{ padding: 26, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(37, 99, 235, 0.1)",
                color: "var(--primary, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                1. Role Creation
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                Create new roles or manage existing organization roles.
              </p>
            </div>
          </div>
        </div>

        {/* Create Role Form */}
        <form onSubmit={handleCreateRole} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Enter new role name (e.g., Team Lead, Reviewer, Manager)"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              style={{
                flex: "1 1 280px",
                maxWidth: 460,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-color, #cbd5e1)",
                fontSize: 14,
                outline: "none"
              }}
              required
            />
            <button
              type="submit"
              className="primary"
              disabled={creatingRole}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                fontSize: 13.5,
                fontWeight: 600,
                borderRadius: 8
              }}
            >
              <Plus size={16} /> {creatingRole ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>

        {/* Existing Roles List */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <strong style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              Existing Roles ({roles.length})
            </strong>

            <div style={{ position: "relative", width: 220 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 12px 6px 30px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color, #cbd5e1)",
                  fontSize: 12.5,
                  outline: "none"
                }}
              />
            </div>
          </div>

          {filteredRoles.length === 0 ? (
            <EmptyState title="No roles found." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13.5 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(0, 0, 0, 0.08)", background: "#f8fafc" }}>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-secondary)" }}>Role Name</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-secondary)" }}>Granted Permissions</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => {
                    const isSelected = selectedRoleId === role.id;
                    const permCount = role.permissions ? role.permissions.length : (role.attached_permissions ? role.attached_permissions.split(",").length : 0);

                    return (
                      <tr
                        key={role.id}
                        style={{
                          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                          background: isSelected ? "rgba(37, 99, 235, 0.04)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {editingNameRoleId === role.id ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  border: "1px solid #2563eb",
                                  fontSize: 13,
                                  outline: "none"
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRoleName(role.id)}
                                style={{
                                  background: "#2563eb",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: "4px 8px",
                                  fontSize: 12,
                                  cursor: "pointer"
                                }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNameRoleId(null)}
                                style={{
                                  background: "none",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 6,
                                  padding: "4px 6px",
                                  fontSize: 12,
                                  cursor: "pointer"
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span>{role.role_name || role.name}</span>
                              {isSelected && (
                                <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(37, 99, 235, 0.12)", color: "#1d4ed8", fontWeight: 700 }}>
                                  Active in Section 2
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{permCount}</span> permissions granted
                        </td>

                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectRoleForPermissions(role.id);
                                permSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              style={{
                                background: isSelected ? "#2563eb" : "rgba(37, 99, 235, 0.08)",
                                color: isSelected ? "#ffffff" : "var(--primary, #1d4ed8)",
                                border: "1px solid rgba(37, 99, 235, 0.25)",
                                borderRadius: 6,
                                padding: "5px 10px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4
                              }}
                              title="Configure & grant permissions for this role"
                            >
                              <Settings2 size={13} /> Configure Permissions
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingNameRoleId(role.id);
                                setEditingNameValue(role.role_name || role.name);
                              }}
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                borderRadius: 6,
                                padding: "5px 8px",
                                cursor: "pointer"
                              }}
                              title="Rename role"
                            >
                              <Edit3 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              style={{
                                background: "rgba(239, 68, 68, 0.08)",
                                color: "#ef4444",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: 6,
                                padding: "5px 8px",
                                cursor: "pointer"
                              }}
                              title="Delete role"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: PERMISSION GRANTING                                            */}
      {/* ========================================================================= */}
      <div ref={permSectionRef} className="table-card" style={{ padding: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.1)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Settings2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                2. Permission Granting
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                Select a role and grant or revoke module access and elevated permissions.
              </p>
            </div>
          </div>

          {activeRole && (
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 999,
                background: "rgba(37, 99, 235, 0.1)",
                color: "var(--primary, #2563eb)",
                border: "1px solid rgba(37, 99, 235, 0.2)"
              }}
            >
              {selectedPermIds.size} / {permissions.length} Selected for {activeRole.role_name || activeRole.name}
            </span>
          )}
        </div>

        {/* Role Selector Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            borderRadius: 10,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            marginBottom: 20,
            flexWrap: "wrap"
          }}
        >
          <label style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            <UserCheck size={16} className="text-primary" />
            Select Role:
          </label>
          <select
            value={selectedRoleId || ""}
            onChange={(e) => handleSelectRoleForPermissions(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border-color, #cbd5e1)",
              background: "#ffffff",
              fontSize: 13.5,
              fontWeight: 600,
              minWidth: 220,
              outline: "none"
            }}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.role_name || r.name}
              </option>
            ))}
          </select>

          {/* Quick Presets Bar */}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => applyPreset("employee")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                cursor: "pointer"
              }}
            >
              + All General Features
            </button>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                cursor: "pointer"
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => applyPreset("clear")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid #fee2e2",
                background: "#fef2f2",
                color: "#dc2626",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Permission Filter Search */}
        <div style={{ marginBottom: 18, position: "relative", maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Filter permissions..."
            value={permSearch}
            onChange={(e) => setPermSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px 7px 30px",
              borderRadius: 6,
              border: "1px solid var(--border-color, #cbd5e1)",
              fontSize: 12.5,
              outline: "none"
            }}
          />
        </div>

        {/* Permission Checklists Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
          {/* Group 1: General Features */}
          <div
            style={{
              background: "#fafbfc",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: 12,
              padding: 16
            }}
          >
            <strong style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>
              General Features ({generalPerms.filter((p) => selectedPermIds.has(p.id)).length}/{generalPerms.length})
            </strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {generalPerms
                .filter((p) => !pQuery || p.permission_name.toLowerCase().includes(pQuery))
                .map((perm) => {
                  const isChecked = selectedPermIds.has(perm.id);
                  return (
                    <label
                      key={perm.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 10px",
                        borderRadius: 6,
                        background: isChecked ? "rgba(37, 99, 235, 0.06)" : "#ffffff",
                        border: isChecked ? "1px solid rgba(37, 99, 235, 0.2)" : "1px solid rgba(0,0,0,0.06)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: isChecked ? 600 : 500,
                        color: isChecked ? "var(--primary, #1d4ed8)" : "var(--text-primary)",
                        userSelect: "none"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(perm.id)}
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--primary, #2563eb)" }}
                      />
                      <span>{perm.permission_name}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          {/* Group 2: Administrative Features */}
          <div
            style={{
              background: "#fafbfc",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: 12,
              padding: 16
            }}
          >
            <strong style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>
              Administrative Features ({permissions.filter((p) => !EMPLOYEE_KEYS.includes(p.permission_key) && selectedPermIds.has(p.id)).length}/{permissions.filter((p) => !EMPLOYEE_KEYS.includes(p.permission_key)).length})
            </strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {elevatedTopPerms
                .filter((p) => {
                  if (!pQuery) return true;
                  const children = childrenMap[p.id] || [];
                  return (
                    p.permission_name.toLowerCase().includes(pQuery) ||
                    children.some((c) => c.permission_name.toLowerCase().includes(pQuery))
                  );
                })
                .map((perm) => {
                  const isChecked = selectedPermIds.has(perm.id);
                  const children = childrenMap[perm.id] || [];

                  return (
                    <div
                      key={perm.id}
                      style={{
                        borderRadius: 8,
                        border: isChecked ? "1px solid rgba(37, 99, 235, 0.2)" : "1px solid rgba(0,0,0,0.06)",
                        background: isChecked ? "rgba(37, 99, 235, 0.03)" : "#ffffff",
                        overflow: "hidden"
                      }}
                    >
                      {/* Top Item */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: isChecked ? 700 : 600,
                          color: isChecked ? "var(--primary, #1d4ed8)" : "var(--text-primary)",
                          userSelect: "none"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.id)}
                          style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--primary, #2563eb)" }}
                        />
                        <span>{perm.permission_name}</span>
                      </label>

                      {/* Nested sub-permissions */}
                      {children.length > 0 && (
                        <div
                          style={{
                            padding: "6px 10px 8px 32px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            borderTop: "1px dashed rgba(0,0,0,0.06)",
                            background: "rgba(0,0,0,0.015)"
                          }}
                        >
                          {children
                            .filter((c) => !pQuery || c.permission_name.toLowerCase().includes(pQuery))
                            .map((child) => {
                              const isChildChecked = selectedPermIds.has(child.id);
                              return (
                                <label
                                  key={child.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    cursor: "pointer",
                                    fontSize: 12.5,
                                    fontWeight: isChildChecked ? 600 : 500,
                                    color: isChildChecked ? "#1e293b" : "var(--text-secondary, #64748b)",
                                    userSelect: "none"
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChildChecked}
                                    onChange={() => togglePermission(child.id)}
                                    style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--primary, #2563eb)" }}
                                  />
                                  <span>{child.permission_name}</span>
                                </label>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Section 2 Actions Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 18 }}>
          <button
            type="button"
            className="primary"
            disabled={savingPerms || !selectedRoleId}
            onClick={handleSavePermissions}
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
            <CheckCircle2 size={16} />
            {savingPerms ? "Saving..." : `Save Permissions for ${activeRole ? activeRole.role_name || activeRole.name : "Role"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
