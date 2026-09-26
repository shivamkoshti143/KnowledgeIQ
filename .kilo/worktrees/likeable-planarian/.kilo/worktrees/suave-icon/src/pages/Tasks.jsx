import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { request } from "../api/client";
import { BookmarkButton } from "../components/BookmarkButton";
import { EmptyState, PageTitle, StatusBadge } from "../components/UI";

export function Tasks({ data, session, onChange, setToast, setRoute, openTask }) {
  const admin = session.role === "admin";
  const allTasks = data.tasks || [];
  const myTasks = allTasks.filter((task) => task.uploaderId === session.id);
  const pending = allTasks.filter((task) => task.status === "pending");
  const approved = allTasks.filter((task) => task.status === "approved");

  async function review(task, decision) {
    const remarks = decision === "rejected" ? window.prompt("Add remarks", "Please provide more details or attach a relevant file.") : "";
    await request(`/tasks/${task.id}/review`, { method: "POST", body: JSON.stringify({ decision, remarks }) });
    await onChange();
    setToast(`Task ${decision}.`);
  }

  const primaryTasks = admin ? pending : myTasks;

  return (
    <>
      <PageTitle
        eyebrow={admin ? "Admin Workflow" : "My Workspace"}
        title="Knowledge"
        subtitle={admin ? "Review employee submissions and publish the best operational knowledge." : "Track your requests, supporting files, and approval progress."}
        actions={!admin ? <button className="primary" onClick={() => setRoute("create-task")}><Plus size={15} /> Submit Task</button> : null}
      // stats={[
      //   { label: "Pending", value: pending.length },
      //   { label: "Approved", value: approved.length },
      //   { label: "Total tasks", value: allTasks.length }
      // ]}
      />
      {admin && (
        <div className="metric-grid">
          <div className="metric"><span>Pending Review</span><strong>{pending.length}</strong></div>
          <div className="metric"><span>Approved</span><strong>{approved.length}</strong></div>
          <div className="metric"><span>Total Knowledge</span><strong>{allTasks.length}</strong></div>
        </div>
      )}

      <div className="task-sections">
        <section className="table-card">
          <div className="section-heading">
            <h2>{admin ? "My Knowledge" : "My Knowledge"}</h2>
          </div>
          {!primaryTasks.length ? (
            <EmptyState title={admin ? "No tasks pending review" : "You have not submitted any tasks yet."} />
          ) : (
            <div className="task-table">
              <div className={`task-table-head ${admin ? "is-admin" : "is-user"}`}>
                <span>Task</span>
                <span>Department</span>
                <span>Status</span>
                <span>{admin ? "Actions" : "Attachment"}</span>
              </div>
              <div className="task-table-body">
                {primaryTasks.map((task) => (
                  <div className={`task-table-row ${admin ? "is-admin" : "is-user"}`} key={task.id}>
                    <div className="task-main-cell">
                      <strong>{task.title}</strong>
                      <p>{task.category?.name} · {task.uploader?.name}</p>
                      <small className="task-preview">{task.description}</small>
                    </div>
                    <div className="task-meta-cell">{task.department?.name || "-"}</div>
                    <div className="task-status-cell"><StatusBadge status={task.status} /></div>
                    <div className="task-actions-cell">
                      {admin ? (
                        <>
                          <button onClick={() => openTask(task.id)}>Details</button>
                          <button className="approve" onClick={() => review(task, "approved")}><CheckCircle2 size={15} /> Approve</button>
                          <button className="reject" onClick={() => review(task, "rejected")}><XCircle size={15} /> Reject</button>
                        </>
                      ) : (
                        <>
                          <BookmarkButton contentType="task" contentId={task.id} initialBookmarked={(data.bookmarks || []).some((b) => b.contentType === "task" && b.contentId === task.id)} />
                          {task.files?.length ? task.files.map((file) => (
                            <a key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer">View attachment</a>
                          )) : <span className="task-muted">No attachment</span>}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="table-card">
          <div className="section-heading"><h2>Approved Knowledge</h2></div>
          {!approved.length ? (
            <EmptyState title="No approved tasks yet" />
          ) : (
            <div className="task-table">
              <div className="task-table-head is-approved">
                <span>Task</span>
                <span>Department</span>
                <span>Owner</span>
                <span>Status</span>
                <span>Attachments</span>
              </div>
              <div className="task-table-body">
                {approved.map((task) => (
                  <div className="task-table-row is-approved" key={task.id}>
                    <div className="task-main-cell">
                      <strong>{task.title}</strong>
                      <p>{task.category?.name}</p>
                      <small className="task-preview">{task.description}</small>
                    </div>
                    <div className="task-meta-cell">{task.department?.name || "-"}</div>
                    <div className="task-meta-cell">{task.uploader?.name || "-"}</div>
                    <div className="task-status-cell"><StatusBadge status={task.status} /></div>
                    <div className="task-actions-cell">
                      <BookmarkButton contentType="task" contentId={task.id} initialBookmarked={(data.bookmarks || []).some((b) => b.contentType === "task" && b.contentId === task.id)} />
                      {task.files?.length ? task.files.map((file) => (
                        <a key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer">Download{file.fileExtension ? ` .${file.fileExtension}` : ""}</a>
                      )) : <span className="task-muted">No attachment</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
