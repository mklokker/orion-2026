import { useState, useEffect } from "react";

export function useUIv2Preview() {
  const [isUIv2Enabled, setIsUIv2Enabled] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("orion-ui-v2-enabled") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isUIv2Enabled) {
      html.classList.add("ui-v2");
    } else {
      html.classList.remove("ui-v2");
    }
    try {
      localStorage.setItem("orion-ui-v2-enabled", String(isUIv2Enabled));
    } catch {}
  }, [isUIv2Enabled]);

  const toggleUIv2 = () => {
    setIsUIv2Enabled(prev => !prev);
  };

  return { isUIv2Enabled, toggleUIv2 };
}