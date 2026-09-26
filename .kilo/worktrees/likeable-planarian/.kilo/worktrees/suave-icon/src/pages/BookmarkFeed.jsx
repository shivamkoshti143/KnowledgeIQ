import { BookmarkCheck } from "lucide-react";
import { PageTitle } from "../components/UI";
import { VideoCard } from "../components/VideoCard";

export function BookmarkFeed({ data, session, setRoute, openItem }) {
  const bookmarks = data.bookmarks || [];
  const isAdmin = session.role === "admin";

  const bookmarkedItems = bookmarks
    .map((bookmark) => {
      if (bookmark.contentType === "video") {
        const item = (data.videos || []).find((v) => v.id === bookmark.contentId);
        return item ? { ...item, contentType: "video" } : null;
      } else if (bookmark.contentType === "task") {
        const item = (data.tasks || []).find((t) => t.id === bookmark.contentId);
        return item ? { ...item, contentType: "task" } : null;
      } else if (bookmark.contentType === "knowledge") {
        const item = (data.knowledgePosts || []).find((k) => k.id === bookmark.contentId);
        return item ? { ...item, contentType: "knowledge" } : null;
      }
      return null;
    })
    .filter(Boolean);

  if (!bookmarkedItems.length) {
    return (
      <>
        <PageTitle title="Bookmarks" subtitle="Content you have saved." />
        <div style={{ padding: 24, color: "#475569" }}>No bookmarks yet. Browse knowledge base, tasks, or videos and tap the bookmark icon to save them here.</div>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Bookmarks" subtitle={`${bookmarkedItems.length} saved items`} />
      <div className="video-grid browse-grid">
        {bookmarkedItems.map((item) => (
          <VideoCard key={`${item.contentType}-${item.id}`} item={item} onClick={() => openItem(item.id, item.contentType)} />
        ))}
      </div>
    </>
  );
}
