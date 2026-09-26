export function TaskRow({ task, onReview, admin }) {
  return (
    <div className="approval-row">
      <div>
        <strong>{task.title}</strong>
        <p>{task.department?.name} · {task.uploader?.name}</p>
        <small>{task.description}</small>
        {task.fileUrl && <a href={task.fileUrl} target="_blank" rel="noreferrer">View attachment</a>}
      </div>
      {admin ? (
        <>
          <button onClick={() => onReview?.(task.id)}>Details</button>
          <button className="approve" onClick={() => onReview?.(task.id, "approved")}><CheckCircle2 size={15} /> Approve</button>
          <button className="reject" onClick={() => onReview?.(task.id, "rejected")}><XCircle size={15} /> Reject</button>
        </>
      ) : (
        <span className={`status ${task.status}`}>{task.status}</span>
      )}
    </div>
  );
}
