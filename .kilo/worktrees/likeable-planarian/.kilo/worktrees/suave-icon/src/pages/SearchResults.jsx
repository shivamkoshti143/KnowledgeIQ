import { Search } from "lucide-react";
import { useState } from "react";
import { PageTitle } from "../components/UI";
import { VideoCard } from "../components/VideoCard";

export function SearchResults({ data, content, openItem }) {
  const [search, setSearch] = useState("");

  const filtered = content.filter((item) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
    return `${item.title} ${item.description} ${tags.join(" ")}`.toLowerCase().includes(term);
  });

  return (
    <>
      <PageTitle
        eyebrow="Explore Library"
        title="Search Results"
        subtitle={`${filtered.length} approved items match your current filters and search terms.`}
      />
      <div className="searchbar wide">
        <Search size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, tag, or department" />
      </div>
      <div className="video-grid browse-grid">
        {filtered.map((item) => <VideoCard key={`${item.contentType}-${item.id}`} item={item} onClick={() => openItem(item.id, item.contentType)} />)}
      </div>
    </>
  );
}