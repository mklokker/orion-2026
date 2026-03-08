import React, { useMemo, useState } from "react";

// Presets de fundo
export const CHAT_BG_PRESETS = [
  { id: "default", label: "Padrão", type: "default", value: "" },
  { id: "neutro", label: "Neutro", type: "solid", value: "#E5E7EB" },
  { id: "azul-suave", label: "Azul Suave", type: "gradient", value: "linear-gradient(135deg, #DBEAFE 0%, #EDE9FE 100%)" },
  { id: "verde-suave", label: "Verde Suave", type: "gradient", value: "linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)" },
  { id: "lavanda", label: "Lavanda", type: "gradient", value: "linear-gradient(135deg, #EDE9FE 0%, #FCE7F3 100%)" },
  { id: "midnight", label: "Midnight", type: "gradient", value: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)" },
  { id: "sunset", label: "Sunset", type: "gradient", value: "linear-gradient(135deg, #FDE68A 0%, #FBBF24 50%, #F97316 100%)" },
  { id: "oceano", label: "Oceano", type: "gradient", value: "linear-gradient(135deg, #0EA5E9 0%, #2563EB 50%, #7C3AED 100%)" },
];

/**
 * ChatBackground - renders GLOBAL background based on user preferences (from UserPresence).
 * Uses position:sticky so it stays fixed in the viewport of the scroll container,
 * covering the entire visible area regardless of scroll position or message count.
 */
export default function ChatBackground({ chatBgPrefs }) {
  const [imgError, setImgError] = useState(false);

  const themeType = chatBgPrefs?.chat_bg_type || "default";
  const themeValue = chatBgPrefs?.chat_bg_value || "";
  const themeOpacity = chatBgPrefs?.chat_bg_opacity ?? 0.15;
  const themeBlur = chatBgPrefs?.chat_bg_blur ?? 0;
  const themeDim = chatBgPrefs?.chat_bg_dim ?? true;

  const bgStyle = useMemo(() => {
    if (themeType === "default" || !themeValue) return null;

    const base = {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 0,
    };

    if (themeType === "solid") {
      return { ...base, backgroundColor: themeValue, opacity: themeOpacity };
    }

    if (themeType === "gradient") {
      return { ...base, background: themeValue, opacity: themeOpacity };
    }

    if (themeType === "image" && !imgError) {
      return {
        ...base,
        backgroundImage: `url(${themeValue})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: themeOpacity,
        filter: themeBlur > 0 ? `blur(${themeBlur}px)` : undefined,
      };
    }

    return null;
  }, [themeType, themeValue, themeOpacity, themeBlur, imgError]);

  if (!bgStyle) return null;

  return (
    <>
      {/* Background layer - sticky to always fill the visible scroll area */}
      <div style={bgStyle}>
        {themeType === "image" && !imgError && (
          <img
            src={themeValue}
            alt=""
            className="hidden"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Dim overlay for readability */}
      {themeDim && themeType !== "default" && themeValue && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
            backgroundColor: "hsl(var(--background))",
            opacity: themeType === "image" ? 0.5 : 0.3,
          }}
        />
      )}
    </>
  );
}