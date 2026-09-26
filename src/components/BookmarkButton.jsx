import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { request } from "../api/client";

export function BookmarkButton({ contentType, contentId, initialBookmarked, onToggle }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBookmarked(Boolean(initialBookmarked));
  }, [initialBookmarked]);

  async function toggle() {
    setLoading(true);
    const nextState = !bookmarked;
    try {
      if (bookmarked) {
        await request("/bookmarks", { method: "DELETE", body: JSON.stringify({ contentType, contentId }) });
        setBookmarked(false);
      } else {
        await request("/bookmarks", { method: "POST", body: JSON.stringify({ contentType, contentId }) });
        setBookmarked(true);
      }
      window.dispatchEvent(
        new CustomEvent("taskiq-bookmark-toggled", {
          detail: { contentType, contentId, bookmarked: nextState }
        })
      );
      onToggle?.();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`bookmark-button ${bookmarked ? "active" : ""}`}
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      {bookmarked ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
    </button>
  );
}
