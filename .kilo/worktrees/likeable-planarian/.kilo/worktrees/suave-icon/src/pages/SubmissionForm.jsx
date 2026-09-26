import { useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";

export function SubmissionForm({ data, onCreated, setToast, setRoute, mode = "task" }) {
  const isKnowledge = mode === "knowledge";
  const [form, setForm] = useState({ title: "", description: "", contentType: isKnowledge ? "file" : "task", categoryId: data.categories[0]?.id, departmentId: data.departments[0]?.id, tags: "", files: [] });

  async function submit(event) {
    event.preventDefault();
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "files" && Array.isArray(value)) {
          value.forEach((file) => body.append("files", file));
        } else if (value) {
          body.append(key, value);
        }
      });
      body.append("status", isKnowledge ? "published" : "pending");

      const endpoint = isKnowledge ? "/knowledge" : "/tasks";
      await request(endpoint, { method: "POST", body });
      setForm({ title: "", description: "", departmentId: data.departments[0]?.id, categoryId: data.categories[0]?.id, tags: "", files: [] });
      await onCreated();
      setToast(isKnowledge ? "Knowledge post published." : "Task submitted for admin review.");
      if (isKnowledge) setRoute("knowledge-feed");
    } catch (error) {
      setToast(error.message);
    }
  }

  const addFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    setForm((current) => ({ ...current, files: [...current.files, ...selected] }));
    event.target.value = "";
  };

  const removeFile = (index) => {
    setForm((current) => ({ ...current, files: current.files.filter((_, i) => i !== index) }));
  };

  return (
    <>
      <PageTitle title={isKnowledge ? "Add Knowledge Post" : "Submit Task"} subtitle={isKnowledge ? "Share text, files, or videos with the team." : "Share a task or problem with your team or admin."} />
      <form className="upload-layout" onSubmit={submit}>
        <div className="form-panel">
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder={isKnowledge ? "Post title" : "Enter task title"} /></label>
          <label>Department<select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>{data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Category<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{data.categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder={isKnowledge ? "react, onboarding" : "bug, feature"} /></label>
          <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required placeholder={isKnowledge ? "Write something..." : "Describe the task or issue in detail"} /></label>
          <div className="form-actions">
            <button className="primary" type="submit">{isKnowledge ? "Publish" : "Submit for Review"}</button>
          </div>
        </div>
        <label className="drop-zone">
          <UploadCloud size={42} />
          <strong>{form.files.length ? `${form.files.length} file(s) selected` : "Attach Files (optional)"}</strong>
          <span>DOCX, PDF, TXT, PNG, JPG, MP4, WebM, MOV up to 500MB each</span>
          <input type="file" accept=".docx,.pdf,.txt,.png,.jpg,.jpeg,.mp4,.webm,.mov" multiple onChange={addFiles} />
        </label>
        {form.files.length > 0 && (
          <div className="file-list">
            {form.files.map((file, index) => (
              <div className="file-chip" key={index}>
                <span>{file.name}</span>
                <button type="button" onClick={() => removeFile(index)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </form>
    </>
  );
}
