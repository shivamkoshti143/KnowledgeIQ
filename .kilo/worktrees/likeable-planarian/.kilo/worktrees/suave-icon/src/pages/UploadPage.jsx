import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { request } from "../api/client";
import { PageTitle } from "../components/UI";

export function UploadPage({ data, onUploaded, setToast }) {
  const [form, setForm] = useState({ title: "", departmentId: data.departments[0]?.id, categoryId: data.categories?.[0]?.id, tags: "", description: "", file: null });

  async function submit(event, draft = false) {
    event.preventDefault();
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => value && body.append(key, value));
    body.append("saveAsDraft", String(draft));

    await request("/videos", { method: "POST", body });
    setForm({ title: "", departmentId: data.departments[0]?.id, categoryId: data.categories?.[0]?.id, tags: "", description: "", file: null });
    await onUploaded();
    setToast(draft ? "Draft saved." : "Video submitted for admin approval.");
  }

  return (
    <>
      <PageTitle title="Upload Video" subtitle="Share a department-specific task guide for review." />
      <form className="upload-layout" onSubmit={(event) => submit(event, false)}>
        <div className="form-panel">
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="Enter video title" /></label>
          <label>Department<select value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value })}>{data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Category<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{data.categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="#react, #javascript" /></label>
          <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required placeholder="Enter detailed description about the video" /></label>
          <div className="form-actions">
            <button type="button" onClick={(event) => submit(event, true)}>Save as Draft</button>
            <button className="primary" type="submit">Submit for Approval</button>
          </div>
        </div>
        <label className="drop-zone">
          <UploadCloud size={42} />
          <strong>{form.file ? form.file.name : "Upload Video"}</strong>
          <span>MP4, WebM, MOV up to 500MB</span>
          <input type="file" accept="video/*" onChange={(event) => setForm({ ...form, file: event.target.files[0] })} />
        </label>
      </form>
    </>
  );
}
