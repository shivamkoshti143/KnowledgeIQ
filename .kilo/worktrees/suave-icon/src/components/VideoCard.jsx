import { FileText, Play } from "lucide-react";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "avi", "mkv"]);

function getThumbInfo(item) {
  if (item.contentType === "video") {
    const thumb = item.thumbnail && !String(item.thumbnail).startsWith("http") ? item.thumbnail : null;
    return { type: thumb ? "class" : "upload", className: thumb ? `thumb-${thumb}` : "thumb-upload", imageUrl: null };
  }

  const files = item.files || [];
  const imageFile = files.find((file) => IMAGE_EXTENSIONS.has((file.fileExtension || "").toLowerCase()));
  if (imageFile) {
    return { type: "image", className: "thumb-upload", imageUrl: imageFile.fileUrl };
  }

  const videoFile = files.find((file) => VIDEO_EXTENSIONS.has((file.fileExtension || "").toLowerCase()));
  if (videoFile) {
    return { type: "video", className: "thumb-upload", imageUrl: null };
  }

  return { type: "file", className: "thumb-upload", imageUrl: null };
}

export function VideoCard({ item, onClick }) {
  const isVideo = item.contentType === "video";
  const thumb = getThumbInfo(item);
  const itemTags = (item.tags || []).slice(0, 3).map((tag) => String(tag).replace(/^#/, ""));

  return (
    <article className="video-card" onClick={onClick}>
      <div className={`thumb ${thumb.className}`}>
        {thumb.type === "image" && thumb.imageUrl ? (
          <img src={thumb.imageUrl} alt={item.title} className="thumb-image" />
        ) : (
          <>
            {(isVideo || thumb.type === "video") ? <Play /> : <FileText size={38} />}
            {isVideo && <span>{item.duration}</span>}
          </>
        )}
      </div>
      <div className="card-copy">
        <h3>{item.title}</h3>
        <p>{item.uploader?.name} · {item.department?.name} · {item.category?.name}</p>
        <div>
          {itemTags.map((tag) => (
            <span className="tag" key={tag}>#{tag}</span>
          ))}
        </div>
        <small>{isVideo ? `${item.viewCount?.toLocaleString() || 0} views` : "Task knowledge"}</small>
      </div>
    </article>
  );
}

export function VideoSection({ title, content, openItem }) {
  return (
    <section className="video-section">
      <div className="section-heading"><h2>{title}</h2></div>
      <div className="video-grid">
        {content.map((item) => (
          <VideoCard key={`${item.contentType}-${item.id}`} item={item} onClick={() => openItem(item.id, item.contentType)} />
        ))}
      </div>
    </section>
  );
}
