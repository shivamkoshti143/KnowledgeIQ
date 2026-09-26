import React from "react";
import { ExternalLink } from "lucide-react";

/**
 * Regex for matching markdown links [title](url) or standalone URLs (http://, https://, www.)
 */
const LINK_REGEX =
  /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]\>])/gi;

/**
 * Parses plain text into an array of text nodes and interactive <a> link elements.
 */
export function linkify(text, customLinkStyle = {}) {
  if (text === null || text === undefined) return null;
  const str = String(text);
  if (!str.trim()) return str;

  const elements = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  // Reset regex index
  LINK_REGEX.lastIndex = 0;

  while ((match = LINK_REGEX.exec(str)) !== null) {
    // Push preceding text
    if (match.index > lastIndex) {
      elements.push(str.substring(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // Markdown formatted link: [title](url)
      const linkTitle = match[1];
      let linkUrl = match[2];
      if (!/^https?:\/\//i.test(linkUrl)) {
        linkUrl = `https://${linkUrl}`;
      }

      elements.push(
        <a
          key={`link-${keyIndex++}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="linkified-anchor"
          style={{
            color: "#2563eb",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            wordBreak: "break-word",
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            ...customLinkStyle
          }}
        >
          <span>{linkTitle}</span>
          <ExternalLink size={12} style={{ display: "inline", opacity: 0.7, flexShrink: 0 }} />
        </a>
      );
    } else if (match[3]) {
      // Raw URL
      const rawUrl = match[3];
      const targetUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

      elements.push(
        <a
          key={`link-${keyIndex++}`}
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="linkified-anchor"
          style={{
            color: "#2563eb",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            wordBreak: "break-word",
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            ...customLinkStyle
          }}
        >
          <span>{rawUrl}</span>
          <ExternalLink size={12} style={{ display: "inline", opacity: 0.7, flexShrink: 0 }} />
        </a>
      );
    }

    lastIndex = LINK_REGEX.lastIndex;
  }

  // Push any remaining text after last match
  if (lastIndex < str.length) {
    elements.push(str.substring(lastIndex));
  }

  return elements.length > 0 ? elements : str;
}

/**
 * LinkifiedText component that wraps text and converts all hyperlinks.
 */
export function LinkifiedText({ text, children, style = {}, linkStyle = {}, className = "" }) {
  const content = text !== undefined ? text : children;

  return (
    <span
      className={className}
      style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        ...style
      }}
    >
      {linkify(content, linkStyle)}
    </span>
  );
}

export default LinkifiedText;
