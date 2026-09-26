import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { request } from "../api/client";
import { EmptyState, Info } from "../components/UI";

const demoVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export function VideoDetail({ data, session, videoId, onChange, setToast }) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const video = data.videos.find((item) => item.id === videoId) || data.videos.find((item) => item.status === "approved");
  const comments = data.comments.filter((comment) => comment.videoId === video?.id);
  const roots = comments.filter((comment) => !comment.parentId);

  useEffect(() => {
    if (video?.status === "approved") {
      request(`/videos/${video.id}/view`, { method: "POST" }).then(onChange).catch(() => {});
    }
  }, [video?.id]);

  async function postComment(event) {
    event.preventDefault();
    await request(`/videos/${video.id}/comments`, { method: "POST", body: JSON.stringify({ body, parentId: replyTo }) });
    setBody("");
    setReplyTo(null);
    await onChange();
    setToast("Discussion updated.");
  }

  if (!video) return <EmptyState title="No video selected" />;

  return (
    <>
      <button className="back-button" onClick={() => history.back()}>Back to Videos</button>
      <div className="detail-layout">
        <section>
          <h1>{video.title}</h1>
          <p className="meta">{video.uploader?.name} · {video.department?.name} · {video.viewCount.toLocaleString()} views</p>
          <video className="player" controls src={video.videoUrl || demoVideo} />
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
          <h3>Video Details</h3>
          <Info label="Department" value={video.department?.name} />
          <Info label="Uploaded" value={new Date(video.createdAt).toLocaleDateString()} />
          <Info label="Status" value={video.status} />
          <p>{video.description}</p>
          <div>{video.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div>
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
        <button onClick={() => reply(comment.id)}><MessageCircle size={14} /> Reply</button>
        {children.map((child) => <Comment key={child.id} comment={child} comments={comments} users={users} reply={reply} />)}
      </div>
    </div>
  );
}
