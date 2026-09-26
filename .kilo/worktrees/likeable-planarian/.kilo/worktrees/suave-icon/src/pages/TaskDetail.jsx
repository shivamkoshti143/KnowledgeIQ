import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { request } from "../api/client";
import { EmptyState, Info } from "../components/UI";

export function TaskDetail({ data, session, taskId, onChange, setToast, setRoute }) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const task = (data.tasks || []).find((item) => item.id === taskId);
  const comments = (data.comments || []).filter((comment) => comment.taskId === task?.id);
  const roots = comments.filter((comment) => !comment.parentId);

  async function postComment(event) {
    event.preventDefault();
    await request(`/tasks/${task.id}/comments`, { method: "POST", body: JSON.stringify({ body, parentId: replyTo }) });
    setBody("");
    setReplyTo(null);
    await onChange();
    setToast("Discussion updated.");
  }

  if (!task) return <EmptyState title="Task not found" />;

  return (
    <>
      <button className="back-button" onClick={() => setRoute("tasks")}>
        <ArrowLeft size={16} /> Back to Knowledge
      </button>
      <div className="detail-layout">
        <section>
          <h1>{task.title}</h1>
          <p className="meta">{task.uploader?.name} · {task.department?.name} · {task.category?.name}</p>
          <div className="player" style={{ display: "grid", placeItems: "center", color: "#94a3b8", background: "#0f172a" }}>
            {task.fileUrl ? (
              <a href={task.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>View Attachment</a>
            ) : (
              "Text Task"
            )}
          </div>
          <div className="tabs"><button className="active-pill">Discussion ({comments.length})</button></div>
          <form className="comment-box" onSubmit={postComment}>
            <div className="profile-dot">{session.name.slice(0, 1)}</div>
            <input value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? "Write your reply..." : "Write your doubt or question..."} required />
            <button className="primary">Post</button>
          </form>
          <div className="comment-list">
            {roots.map((comment) => <Comment key={comment.id} comment={comment} comments={comments} users={data.users} reply={(id) => setReplyTo(id)} />)}
          </div>
        </section>
        <aside className="details-panel">
          <h3>Task Details</h3>
          <Info label="Department" value={task.department?.name} />
          <Info label="Category" value={task.category?.name} />
          <Info label="Uploaded" value={new Date(task.createdAt).toLocaleDateString()} />
          <Info label="Status" value={task.status} />
          <p>{task.description}</p>
        </aside>
      </div>
    </>
  );
}

function Comment({ comment, comments, users, reply }) {
  const user = users.find((item) => item.id === comment.userId);
  const children = comments.filter((item) => item.parentId === comment.id);

  return (
    <div className="comment">
      <div className="profile-dot">{user?.name?.slice(0, 1) || "?"}</div>
      <div>
        <div className="comment-header"><strong>{user?.name}</strong><span>{new Date(comment.createdAt).toLocaleString()}</span></div>
        <p>{comment.body}</p>
        <button onClick={() => reply(comment.id)}>Reply</button>
        {children.map((child) => <Comment key={child.id} comment={child} comments={comments} users={users} reply={reply} />)}
      </div>
    </div>
  );
}
