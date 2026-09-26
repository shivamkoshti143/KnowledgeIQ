import { useEffect, useState } from "react";
import { ArrowLeft, Download, Star } from "lucide-react";
import { FileCarousel } from "../pages/KnowledgeFeed";
import { request } from "../api/client";
import { BookmarkButton } from "../components/BookmarkButton";
import { EmptyState, Info, PageTitle } from "../components/UI";

export function KnowledgeDetail({ data, session, contentType, itemId, onChange, setToast, setRoute }) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [recommended, setRecommended] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const isVideo = contentType === "video";
  const isKnowledge = contentType === "knowledge";
  const items = isVideo ? (data.videos || []) : isKnowledge ? (data.knowledgePosts || []) : (data.tasks || []);
  const item = items.find((x) => Number(x.id) === Number(itemId)) || [data.videos || [], data.knowledgePosts || [], data.tasks || []].flat().find((x) => Number(x.id) === Number(itemId));
  const comments = isVideo || isKnowledge ? [] : (data.comments || []).filter((comment) => comment[`${contentType}Id`] === item?.id);
  const roots = comments.filter((comment) => !comment.parentId);

  const resolvedContentType = item ? (isVideo ? "video" : isKnowledge || item.contentType === "knowledge" || item.source === "knowledge" ? "knowledge" : item.contentType === "task" || item.source === "task" ? "task" : contentType) : contentType;

  const isBookmarked = (data.bookmarks || []).some((b) => {
    const bookmarkType = resolvedContentType === "video" ? "video" : resolvedContentType === "knowledge" ? "knowledge" : "task";
    return b.contentType === bookmarkType && b.contentId === item?.id;
  });

  useEffect(() => {
    if (item) {
      setRecommended(Boolean(item.isRecommended));
    }
  }, [item?.id, item?.isRecommended]);

  const files = item?.files?.length ? item.files : (item?.fileUrl ? [{ fileUrl: item.fileUrl, fileExtension: item.fileExtension }] : []);
  const primaryFile = files[0];
  const primaryExt = (primaryFile?.fileExtension || "").toLowerCase();
  const isOfficeFile = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(primaryExt);

  useEffect(() => {
    if (!item) return;
    if (item.status !== "approved" && resolvedContentType === "video") return;
    if (resolvedContentType === "video") {
      request(`/videos/${item.id}/view`, { method: "POST" }).then(onChange).catch(() => { });
    }
  }, [item?.id, resolvedContentType, item?.status, onChange]);

  async function postComment(event) {
    event.preventDefault();
    if (resolvedContentType !== "video" && resolvedContentType !== "knowledge") {
      const path = `/tasks/${item.id}/comments`;
      await request(path, { method: "POST", body: JSON.stringify({ body, parentId: replyTo }) });
      setBody("");
      setReplyTo(null);
      await onChange();
      setToast("Discussion updated.");
    }
  }

  async function toggleRecommend() {
    setRecommendLoading(true);
    try {
      const endpoint = resolvedContentType === "knowledge" ? `/knowledge/${item.id}/recommend` : `/${resolvedContentType}s/${item.id}/recommend`;
      await request(endpoint, { method: "POST", body: JSON.stringify({ isRecommended: !recommended }) });
      setRecommended(!recommended);
      setToast(recommended ? "Removed from Recommended" : "Added to Recommended");
      onChange?.();
    } catch (error) {
      console.error(error);
      setToast("Failed to update recommendation.");
    } finally {
      setRecommendLoading(false);
    }
  }

  if (!item) {
    return (
      <div className="loading">
        <div style={{ color: "#c00" }}>Content not found</div>
        <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
          contentType={contentType} itemId={itemId} videos={data?.videos?.length || 0} tasks={data?.tasks?.length || 0} knowledgePosts={data?.knowledgePosts?.length || 0}
        </div>
        <button className="secondary" onClick={() => setRoute("knowledge-feed")} style={{ marginTop: 16 }}>Back to Knowledge Base</button>
      </div>
    );
  }

  const admin = session?.role === "admin";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="back-button" onClick={() => setRoute(resolvedContentType === "knowledge" ? "knowledge-feed" : resolvedContentType === "video" ? "home" : "tasks")}>
          <ArrowLeft size={16} /> Back to {resolvedContentType === "knowledge" ? "Knowledge Base" : resolvedContentType === "video" ? "Browse" : "Knowledge"}
        </button>
        {item && <BookmarkButton contentType={resolvedContentType === "video" ? "video" : resolvedContentType === "knowledge" ? "knowledge" : "task"} contentId={item.id} initialBookmarked={isBookmarked} onToggle={onChange} />}
        {admin && (
          <button
            type="button"
            className={`secondary ${recommended ? "active" : ""}`}
            onClick={toggleRecommend}
            disabled={recommendLoading}
            title={recommended ? "Remove from Recommended" : "Add to Recommended"}
          >
            <Star size={16} /> {recommended ? "Recommended" : "Recommend"}
          </button>
        )}
      </div>
      <PageTitle
        eyebrow={resolvedContentType === "video" ? "Video Knowledge" : resolvedContentType === "knowledge" ? "Knowledge Post" : "Task Knowledge"}
        title={item.title}
        subtitle={`${item.uploader?.name} · ${item.department?.name} · ${item.category?.name}${resolvedContentType === "video" ? ` · ${item.viewCount?.toLocaleString() || 0} views` : ""}`}
      />
      <div className="detail-layout">
        <section>
          {(resolvedContentType === "video" || files.length > 0) && (
            <FileCarousel
              files={
                resolvedContentType === "video"
                  ? [{ fileUrl: item.videoUrl, fileExtension: item.fileExtension || "mp4" }, ...files]
                  : files
              }
              contentType={resolvedContentType === "video" ? "video" : "file"}
              title={item.title}
            />
          )}
          {(item.description || item.description?.trim()) && (
            <div className="content-preview">
              <h3>Description</h3>
              <p>{item.description}</p>
            </div>
          )}

          {item.tags?.length > 0 && (
            <div className="tag-row">{item.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div>
          )}

          <div className="tabs"><button className="active-pill">Discussion ({comments.length})</button></div>
          <form className="comment-box" onSubmit={postComment}>
            <div className="profile-dot">{session.name.slice(0, 1)}</div>
            <input value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? "Write your reply..." : "Ask a question or add context..."} required />
            <button className="primary">Post</button>
          </form>
          <div className="comment-list">
            {roots.map((comment) => <Comment key={comment.id} comment={comment} comments={comments} users={data.users} reply={(id) => setReplyTo(id)} />)}
          </div>
        </section>
        <aside className="details-panel">
          <h3>{resolvedContentType === "video" ? "Video Details" : "Knowledge Details"}</h3>
          <Info label="Department" value={item.department?.name} />
          <Info label="Category" value={item.category?.name} />
          <Info label="Uploaded" value={new Date(item.createdAt).toLocaleDateString()} />
          <Info label="Status" value={item.status} />
          {files.length > 0 && (
            <Info label="Attachments" value={
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {files.map((file, idx) => (
                  <a key={idx} href={file.fileUrl} target="_blank" rel="noreferrer" className="resource-link">
                    {file.fileExtension ? file.fileExtension.toUpperCase() : "FILE"} {idx + 1}
                  </a>
                ))}
              </div>
            } />
          )}
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
