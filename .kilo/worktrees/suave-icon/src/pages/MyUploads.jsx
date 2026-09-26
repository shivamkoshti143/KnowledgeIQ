import { PageTitle, StatusBadge } from "../components/UI";

export function MyUploads({ data, session }) {
  const myVideos = data.videos.filter((video) => video.uploaderId === session.id);
  const myTasks = (data.tasks || []).filter((task) => task.uploaderId === session.id);

  return (
    <>
      <PageTitle title="My Uploads" subtitle="Track approval status and admin remarks for your contributions." />
      <div className="table-card">
        {myVideos.map((video) => <StatusRow key={`video-${video.id}`} item={video} type="video" />)}
        {myTasks.map((task) => <StatusRow key={`task-${task.id}`} item={task} type="task" />)}
      </div>
    </>
  );
}

function StatusRow({ item, type }) {
  return (
    <div className="status-row">
      <div>
        <strong>{item.title}</strong>
        <p>{item.description}</p>
        {item.rejectionRemarks && <small>Remarks: {item.rejectionRemarks}</small>}
      </div>
      <StatusBadge status={item.status} />
    </div>
  );
}
