import { useState } from "react";
import { Building2, Folder, Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";
import { hasPermission } from "../utils/permissions";

export function ManageTaxonomy({ data, onChange, setToast, session }) {
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [editingDepartmentDescription, setEditingDepartmentDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const isAdmin = session?.role === "admin";
  const hasDeptPerm = hasPermission(session, "taxonomy_departments");
  const hasCatPerm = hasPermission(session, "taxonomy_categories");
  const hasGenericParentOnly = hasPermission(session, "manage_taxonomy") && !hasDeptPerm && !hasCatPerm;

  const canManageDept = isAdmin || hasDeptPerm || hasGenericParentOnly;
  const canManageCat = isAdmin || hasCatPerm || hasGenericParentOnly;

  async function addDepartment(event) {
    event.preventDefault();
    if (!department.trim()) return;
    try {
      await request("/departments", { method: "POST", body: JSON.stringify({ name: department.trim() }) });
      setDepartment("");
      await onChange();
      setToast("Department added.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    if (!category.trim()) return;
    try {
      await request("/categories", { method: "POST", body: JSON.stringify({ name: category.trim() }) });
      setCategory("");
      await onChange();
      setToast("Category added.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function removeDepartment(id, name) {
    if (!window.confirm(`Delete department "${name}"?`)) return;
    try {
      await request(`/departments/${id}`, { method: "DELETE" });
      await onChange();
      setToast("Department removed.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function saveDepartment(id) {
    try {
      await request(`/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingDepartmentName, description: editingDepartmentDescription })
      });
      setEditingDepartmentId(null);
      await onChange();
      setToast("Department updated.");
    } catch (error) {
      setToast(error.message);
    }
  }

  function startEditDepartment(item) {
    setEditingDepartmentId(item.id);
    setEditingDepartmentName(item.name);
    setEditingDepartmentDescription(item.description || "");
  }

  async function removeCategory(id, name) {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await request(`/categories/${id}`, { method: "DELETE" });
      await onChange();
      setToast("Category removed.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function saveCategory(id) {
    try {
      await request(`/categories/${id}`, { method: "PUT", body: JSON.stringify({ name: editingCategoryName }) });
      setEditingCategoryId(null);
      await onChange();
      setToast("Category updated.");
    } catch (error) {
      setToast(error.message);
    }
  }

  function startEditCategory(item) {
    setEditingCategoryId(item.id);
    setEditingCategoryName(item.name);
  }

  return (
    <div className="manage-taxonomy-page" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <PageTitle
        eyebrow="System Configuration"
        title="Departments & Categories"
        subtitle="Manage available learning areas, organizational teams, and knowledge categories."
      />

      <div style={{ display: "grid", gridTemplateColumns: canManageDept && canManageCat ? "1fr 1fr" : "1fr", gap: 24, alignItems: "start" }}>
        {/* Departments Panel */}
        {canManageDept && (
          <div className="table-card" style={{ padding: "24px 26px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Building2 size={18} style={{ color: "#2563eb" }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Departments
                </h2>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#eff6ff", color: "#2563eb" }}>
                {data.departments?.length || 0}
              </span>
            </div>

            {/* Add Department Form */}
            <form onSubmit={addDepartment} style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="New department name..."
                required
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13.5,
                  outline: "none",
                  background: "#f8fafc"
                }}
              />
              <button
                type="submit"
                className="primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 14px", fontSize: 13 }}
              >
                <Plus size={15} /> Add
              </button>
            </form>

            {/* Departments List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(data.departments || []).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10
                  }}
                >
                  {editingDepartmentId === item.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      <input
                        type="text"
                        value={editingDepartmentName}
                        onChange={(e) => setEditingDepartmentName(e.target.value)}
                        placeholder="Department name"
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #2563eb", fontSize: 13 }}
                      />
                      <input
                        type="text"
                        value={editingDepartmentDescription}
                        onChange={(e) => setEditingDepartmentDescription(e.target.value)}
                        placeholder="Optional description"
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => saveDepartment(item.id)}
                          style={{ padding: "4px 10px", fontSize: 12 }}
                        >
                          <Check size={12} /> Save
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setEditingDepartmentId(null)}
                          style={{ padding: "4px 10px", fontSize: 12 }}
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <strong style={{ fontSize: 13.5, color: "#1e293b" }}>{item.name}</strong>
                        {item.description && (
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{item.description}</p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => startEditDepartment(item)}
                          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
                          title="Edit department"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDepartment(item.id, item.name)}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}
                          title="Delete department"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories Panel */}
        {canManageCat && (
          <div className="table-card" style={{ padding: "24px 26px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Folder size={18} style={{ color: "#0ea5e9" }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Categories
                </h2>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#e0f2fe", color: "#0284c7" }}>
                {data.categories?.length || 0}
              </span>
            </div>

            {/* Add Category Form */}
            <form onSubmit={addCategory} style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="New category name..."
                required
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13.5,
                  outline: "none",
                  background: "#f8fafc"
                }}
              />
              <button
                type="submit"
                className="primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 14px", fontSize: 13 }}
              >
                <Plus size={15} /> Add
              </button>
            </form>

            {/* Categories List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(data.categories || []).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10
                  }}
                >
                  {editingCategoryId === item.id ? (
                    <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        placeholder="Category name"
                        style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #2563eb", fontSize: 13 }}
                      />
                      <button
                        type="button"
                        className="primary"
                        onClick={() => saveCategory(item.id)}
                        style={{ padding: "5px 10px", fontSize: 12 }}
                      >
                        <Check size={12} /> Save
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setEditingCategoryId(null)}
                        style={{ padding: "5px 10px", fontSize: 12 }}
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <strong style={{ fontSize: 13.5, color: "#1e293b" }}>{item.name}</strong>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => startEditCategory(item)}
                          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
                          title="Edit category"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCategory(item.id, item.name)}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}
                          title="Delete category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}