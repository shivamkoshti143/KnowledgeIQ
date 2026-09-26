import { PageTitle } from "../components/UI";
import { VideoCard } from "../components/VideoCard";
import { EmptyState } from "../components/UI";

export function RecommendedFeed({ data, session, setRoute, openItem }) {
  const recommendedVideos = (data.videos || []).filter((v) => v.isRecommended && v.status === "approved").map((v) => ({ ...v, contentType: "video" }));
  const recommendedTasks = (data.tasks || []).filter((t) => t.isRecommended && t.status === "approved").map((t) => ({ ...t, contentType: "task" }));
  const recommendedKnowledge = (data.knowledgePosts || []).filter((k) => k.isRecommended && k.status === "published").map((k) => ({ ...k, contentType: "knowledge" }));
  const items = [...recommendedVideos, ...recommendedTasks, ...recommendedKnowledge].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!items.length) {
    return (
      <>
        <PageTitle title="Recommended" subtitle="Content highlighted by admins." />
        <EmptyState title="No recommendations yet" />
      </>
    );
  }

  return (
    <>
      <PageTitle title="Recommended" subtitle={`${items.length} recommended items`} />
      <div className="video-grid browse-grid">
        {items.map((item) => (
          <VideoCard key={`${item.contentType}-${item.id}`} item={item} onClick={() => openItem(item.id, item.contentType)} />
        ))}
      </div>
    </>
  );
}
