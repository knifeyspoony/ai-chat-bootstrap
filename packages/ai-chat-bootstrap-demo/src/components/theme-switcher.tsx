"use client";
import React from "react";

export function ThemeSwitcher() {
  const [dark, setDark] = React.useState(true);
  const [alt, setAlt] = React.useState(false);

  React.useEffect(() => {
    const html = document.documentElement;
    if (dark) html.setAttribute("data-theme", "dark");
    else html.removeAttribute("data-theme");
    if (alt) html.classList.add("demo-alt");
    else html.classList.remove("demo-alt");
  }, [dark, alt]);

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2 text-xs backdrop-blur">
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={dark}
          onChange={(e) => setDark(e.target.checked)}
          className="h-3 w-3"
        />
        Dark
      </label>
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={alt}
          onChange={(e) => setAlt(e.target.checked)}
          className="h-3 w-3"
        />
        Alt
      </label>
    </div>
  );
}

export default ThemeSwitcher;
