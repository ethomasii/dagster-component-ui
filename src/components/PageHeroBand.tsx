import type { CSSProperties, ReactNode } from "react";

/** The bold purple hero band, factored out of Home's hero so every page's intro section
 *  (eyebrow + H1 + subtitle, plus whatever primary controls sit right under them) can use
 *  the same treatment instead of a plain background -- full-bleed, same gradient, same
 *  "pop" the home page hero has. Children still need their OWN text colors set for contrast
 *  (white/cyan instead of the normal gray/dark theme colors) -- this only supplies the
 *  background; see Home.tsx's hero for the reference recoloring of eyebrow/h1/subtitle/chips,
 *  and keep real text INPUTS on their normal opaque theme background (var(--bg-card)) rather
 *  than recoloring those too -- an opaque white search box reads fine on any backdrop and
 *  typed text stays crisp, which a translucent treatment would undermine. */
export function PageHeroBand({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background:
          "radial-gradient(ellipse 1400px 700px at 15% -20%, rgba(139, 92, 246, 0.55), transparent 60%), " +
          "linear-gradient(135deg, var(--accent) 0%, #5b21b6 45%, #3b0764 100%)",
        color: "#fff",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
