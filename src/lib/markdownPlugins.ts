import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

/** GFM tables/task lists/etc. plus GitHub-compatible `id` on headings (TOC fragment links). */
export const docMarkdownRemarkPlugins = [remarkGfm];
export const docMarkdownRehypePlugins = [
  rehypeSlug,
  // Appends a hover-revealed `#` link to each heading (styled via `.heading-anchor` in index.css).
  [
    rehypeAutolinkHeadings,
    {
      behavior: "append",
      properties: { className: ["heading-anchor"], ariaLabel: "Link to this section" },
      content: { type: "text", value: "#" },
    },
  ],
] as import("react-markdown").Options["rehypePlugins"];
