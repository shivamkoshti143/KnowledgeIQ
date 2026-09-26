import { CheckCircle2, Clock3, FileVideo, MessageCircle, Play, Star, Users, XCircle } from "lucide-react";
import { request } from "../api/client";
import { EmptyState, Metric, PageTitle } from "../components/UI";

export function AdminDashboard({ data, onChange, setToast, openItem }) {
  const pendingVideos = data.videos.filter((video) => video.status === "pending");
  const pendingTasks = (data.tasks || []).filter((task) => task.status === "pending");
  const approved = data.videos.filter((video) => video.status === "approved");
  const activeDepartments = [...new Set(approved.map((video) => video.department?.name))].length;

  async function reviewVideo(video, decision) {
    const remarks = decision === "rejected" ? window.prompt("Add rejection remarks", "Please add clearer audio and a task-focused demo.") : "";
    await request(`/videos/${video.id}/review`, { method: "POST", body: JSON.stringify({ decision, remarks }) });
    await onChange();
    setToast(`Video ${decision}.`);
  }

  async function reviewTask(task, decision) {
    const remarks = decision === "rejected" ? window.prompt("Add remarks", "Please provide more details or attach a relevant file.") : "";
    await request(`/tasks/${task.id}/review`, { method: "POST", body: JSON.stringify({ decision, remarks }) });
    await onChange();
    setToast(`Task ${decision}.`);
  }

  async function toggleVideoRecommended(video) {
    await request(`/videos/${video.id}/recommend`, { method: "POST", body: JSON.stringify({ isRecommended: !video.isRecommended }) });
    await onChange();
    setToast(video.isRecommended ? "Removed from Recommended" : "Added to Recommended");
  }

  async function toggleTaskRecommended(task) {
    await request(`/tasks/${task.id}/recommend`, { method: "POST", body: JSON.stringify({ isRecommended: !task.isRecommended }) });
    await onChange();
    setToast(task.isRecommended ? "Removed from Recommended" : "Added to Recommended");
  }

  return (
    <>
      <PageTitle
        eyebrow="Knowledge Portal Admin"
        title="Publishing dashboard"
        subtitle="Review submissions, maintain quality, and keep organizational knowledge flowing smoothly."
      // stats={[
      //   { label: "Pending approvals", value: pendingVideos.length + pendingTasks.length },
      //   { label: "Published videos", value: approved.length },
      //   { label: "Active departments", value: activeDepartments }
      // ]}
      />
      <div className="metric-grid">
        <Metric icon={<Clock3 />} label="Pending Approvals" value={pendingVideos.length + pendingTasks.length} />
        <Metric icon={<FileVideo />} label="Total Videos" value={data.videos.length} />
        <Metric icon={<Users />} label="Total Users" value={data.users.length} />
        <Metric icon={<MessageCircle />} label="Active Departments" value={activeDepartments} />
      </div>
      <div className="admin-grid">
        <section className="panel">
          <div className="section-heading"><h2>Approval Queue</h2><button>View All</button></div>
          {pendingVideos.map((video) => (
            <div className="approval-row" key={`video-${video.id}`}>
              <div className={`mini-thumb thumb-${video.thumbnail}`}><Play size={16} /></div>
              <div><strong>{video.title}</strong><p>{video.department?.name} · #{video.tags.join(" #")}</p><small>Uploaded by {video.uploader?.name}</small></div>
              <button onClick={() => openItem(video.id, "video")}>Preview</button>
              <button className="approve" onClick={() => reviewVideo(video, "approved")}><CheckCircle2 size={15} /> Approve</button>
              <button className="reject" onClick={() => reviewVideo(video, "rejected")}><XCircle size={15} /> Reject</button>
              <button className={`secondary ${video.isRecommended ? "active" : ""}`} onClick={() => toggleVideoRecommended(video)} title={video.isRecommended ? "Remove from Recommended" : "Add to Recommended"}>
                <Star size={15} /> {video.isRecommended ? "Recommended" : "Recommend"}
              </button>
            </div>
          ))}
          {pendingTasks.map((task) => (
            <div className="approval-row" key={`task-${task.id}`}>
              <div className={`mini-thumb thumb-upload`}><Play size={16} /></div>
              <div><strong>{task.title}</strong><p>{task.department?.name} · {task.category?.name}</p><small>Uploaded by {task.uploader?.name}</small></div>
              <button onClick={() => openItem(task.id, "task")}>Preview</button>
              <button className="approve" onClick={() => reviewTask(task, "approved")}><CheckCircle2 size={15} /> Approve</button>
              <button className="reject" onClick={() => reviewTask(task, "rejected")}><XCircle size={15} /> Reject</button>
              <button className={`secondary ${task.isRecommended ? "active" : ""}`} onClick={() => toggleTaskRecommended(task)} title={task.isRecommended ? "Remove from Recommended" : "Add to Recommended"}>
                <Star size={15} /> {task.isRecommended ? "Recommended" : "Recommend"}
              </button>
            </div>
          ))}
          {!pendingVideos.length && !pendingTasks.length && <EmptyState title="No items waiting for review" />}
        </section>
        <section className="panel">
          <div className="section-heading"><h2>Top Performing Videos</h2><button>View All</button></div>
          {[...approved].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map((video) => (
            <div className="leader-row" key={video.id}>
              <div className={`mini-thumb thumb-${video.thumbnail}`} />
              <strong>{video.title}</strong>
              <span>{video.viewCount.toLocaleString()}</span>
              <button className={`secondary ${video.isRecommended ? "active" : ""}`} onClick={() => toggleVideoRecommended(video)} title={video.isRecommended ? "Remove from Recommended" : "Add to Recommended"}>
                <Star size={15} /> {video.isRecommended ? "Recommended" : "Recommend"}
              </button>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
