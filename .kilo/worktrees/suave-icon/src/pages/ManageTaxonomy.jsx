import { useState } from "react";
import { BookOpen, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";

export function ManageTaxonomy({ data, onChange, setToast }) {
  const [department, setDepartment] = useState("");
  const [tag, setTag] = useState("");
  const [category, setCategory] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [editingDepartmentDescription, setEditingDepartmentDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  async function addDepartment(event) {
    event.preventDefault();
    try {
      await request("/departments", { method: "POST", body: JSON.stringify({ name: department }) });
      setDepartment("");
      await onChange();
      setToast("Department added.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function addTag(event) {
    event.preventDefault();
    try {
      await request("/tags", { method: "POST", body: JSON.stringify({ name: tag }) });
      setTag("");
      await onChange();
      setToast("Tag added.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    try {
      await request("/categories", { method: "POST", body: JSON.stringify({ name: category }) });
      setCategory("");
      await onChange();
      setToast("Category added.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function removeDepartment(id) {
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
      await request(`/departments/${id}`, { method: "PUT", body: JSON.stringify({ name: editingDepartmentName, description: editingDepartmentDescription }) });
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

  async function removeCategory(id) {
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
    <div className="two-column">
      <section className="panel">
        <PageTitle title="Departments" subtitle="Add and review available learning areas." />
        <form className="inline-form" onSubmit={addDepartment}>
          <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department name" />
          <button className="primary"><Plus size={16} /> Add</button>
        </form>
        {data.departments.map((item) => (
          editingDepartmentId === item.id ? (
            <div className="manage-row" key={item.id}>
              <div style={{ display: "grid", gap: 8 }}>
                <input value={editingDepartmentName} onChange={(event) => setEditingDepartmentName(event.target.value)} placeholder="Department name" />
                <input value={editingDepartmentDescription} onChange={(event) => setEditingDepartmentDescription(event.target.value)} placeholder="Description" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="primary" onClick={() => saveDepartment(item.id)}>Save</button>
                <button onClick={() => setEditingDepartmentId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="manage-row" key={item.id}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={16} /> {item.name}</div>
                {item.description && <p style={{ margin: 0 }}>{item.description}</p>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => startEditDepartment(item)}><Pencil size={14} /></button>
                <button onClick={() => removeDepartment(item.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          )
        ))}
      </section>
      <section className="panel">
        <PageTitle title="Categories" subtitle="Organize knowledge by type." />
        <form className="inline-form" onSubmit={addCategory}>
          <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category name" />
          <button className="primary"><Plus size={16} /> Add</button>
        </form>
        <div className="tag-cloud">
          {(data.categories || []).map((item) => (
            editingCategoryId === item.id ? (
              <span className="tag" key={item.id}>
                <input value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} placeholder="Category name" style={{ width: 120, marginRight: 4 }} />
                <button className="primary" onClick={() => saveCategory(item.id)} style={{ padding: "2px 8px", fontSize: 12 }}>Save</button>
                <button onClick={() => setEditingCategoryId(null)} style={{ padding: "2px 8px", fontSize: 12 }}>Cancel</button>
              </span>
            ) : (
              <span className="tag" key={item.id}>
                <FolderTree size={12} /> {item.name}
                <button onClick={() => startEditCategory(item)}><Pencil size={12} /></button>
                <button className="tag-remove" onClick={() => removeCategory(item.id)}><Trash2 size={12} /></button>
              </span>
            )
          ))}
        </div>
      </section>
      <section className="panel">
        <PageTitle title="Tags" subtitle="Maintain searchable hashtag topics." />
        <form className="inline-form" onSubmit={addTag}>
          <input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="#tag" />
          <button className="primary"><Plus size={16} /> Add</button>
        </form>
        <div className="tag-cloud">
          {data.tags.map((item) => <span className="tag" key={item.id}>#{item.name}</span>)}
        </div>
      </section>
    </div>
  );
}